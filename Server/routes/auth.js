const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const admin = require('../config/firebaseConfig');
const enviarEmail = require('../config/emailService');

const Vendedor = require('../models/Vendedor');
const Cliente = require('../models/Cliente');

const router = express.Router();

// Retorna o modelo correspondente ao tipo de usuário
const getModelByType = (tipo) => {
    if (tipo === 'vendedor') return Vendedor;
    if (tipo === 'cliente') return Cliente;
    return null;
};

// Cadastro de cliente ou vendedor
// O envio de imagens está desativado temporariamente.
router.post('/register/:tipo', async (req, res) => {
    const { nome, email, senha, confirmasenha, telefone, chavePix } = req.body;
    const { tipo } = req.params;

    const Model = getModelByType(tipo);

    if (!Model) {
        return res.status(400).json({
            msg: 'Tipo de usuário inválido. Use cliente ou vendedor.'
        });
    }

    if (!nome || !email || !senha || !confirmasenha || !telefone) {
        return res.status(422).json({
            msg: 'Preencha todos os campos obrigatórios.'
        });
    }

    if (senha !== confirmasenha) {
        return res.status(422).json({
            msg: 'As senhas não conferem.'
        });
    }

    let firebaseUID = null;

    try {
        const usuarioExistente = await Model.findOne({ email });

        if (usuarioExistente) {
            return res.status(409).json({
                msg: 'Já existe um usuário cadastrado com esse e-mail.'
            });
        }

        // Cria a conta no Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email,
            password: senha,
            displayName: nome
        });

        firebaseUID = userRecord.uid;

        const dadosUsuario = {
            firebaseUID,
            nome,
            email,
            telefone
        };

        if (tipo === 'vendedor') {
            dadosUsuario.imagemPerfil = '';
            dadosUsuario.imagemCapa = '';

            if (chavePix) {
                dadosUsuario.chavePix = chavePix;
            }
        }

        // Salva o usuário no MongoDB
        const user = new Model(dadosUsuario);
        await user.save();

        const usuarioResposta = user.toObject();
        delete usuarioResposta.senha;

        return res.status(201).json({
            msg: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} criado com sucesso!`,
            user: usuarioResposta
        });

    } catch (error) {
        console.error(
            'Erro ao cadastrar usuário:',
            error.code || error.message
        );

        // Se o MongoDB falhar após a criação no Firebase,
        // tenta remover a conta criada para manter a consistência.
        if (firebaseUID) {
            try {
                await admin.auth().deleteUser(firebaseUID);
            } catch (deleteError) {
                console.error(
                    'Falha ao limpar conta do Firebase:',
                    deleteError.code || deleteError.message
                );
            }
        }

        if (error.code === 11000) {
            return res.status(409).json({
                msg: 'Já existe um usuário com esses dados.'
            });
        }

        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({
                msg: 'Este e-mail já está cadastrado no Firebase.'
            });
        }

        if (
            error.code === 'auth/invalid-email' ||
            error.code === 'auth/weak-password'
        ) {
            return res.status(422).json({
                msg: 'E-mail inválido ou senha fora dos requisitos.'
            });
        }

        return res.status(500).json({
            msg: 'Erro ao cadastrar usuário.'
        });
    }
});

// Login de cliente ou vendedor
router.post('/login/:tipo', async (req, res) => {
    const { email, senha } = req.body;
    const { tipo } = req.params;

    const Model = getModelByType(tipo);

    if (!Model) {
        return res.status(400).json({
            msg: 'Tipo de usuário inválido. Use cliente ou vendedor.'
        });
    }

    if (
        typeof email !== 'string' ||
        typeof senha !== 'string' ||
        !email.trim() ||
        !senha
    ) {
        return res.status(422).json({
            msg: 'Informe o e-mail e a senha.'
        });
    }

    if (!process.env.FIREBASE_API_KEY || !process.env.SECRET) {
        console.error('Login indisponível: configuração ausente.');

        return res.status(500).json({
            msg: 'A autenticação não está configurada corretamente no servidor.'
        });
    }

    try {
        // Autentica no Firebase Authentication
        const firebaseAuthUrl =
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;

        const { data } = await axios.post(
            firebaseAuthUrl,
            {
                email: email.trim(),
                password: senha,
                returnSecureToken: true
            },
            {
                timeout: 10000
            }
        );

        // Procura o usuário correspondente no MongoDB
        const user = await Model.findOne({
            firebaseUID: data.localId
        });

        if (!user) {
            return res.status(404).json({
                msg: 'Usuário autenticado no Firebase, mas não encontrado no banco de dados para este tipo de conta.'
            });
        }

        // Gera o JWT utilizado pela API
        const token = jwt.sign(
            { id: user.firebaseUID },
            process.env.SECRET,
            { expiresIn: '7d' }
        );

        const usuarioResposta = {
            id: user._id,
            nome: user.nome,
            email: user.email,
            telefone: user.telefone
        };

        if (tipo === 'vendedor') {
            usuarioResposta.imagemPerfil = user.imagemPerfil;
            usuarioResposta.imagemCapa = user.imagemCapa;
            usuarioResposta.descricao = user.descricao;
            usuarioResposta.chavePix = user.chavePix;
            usuarioResposta.status = user.status;
        }

        return res.status(200).json({
            msg: 'Autenticação realizada com sucesso.',
            token,
            user: usuarioResposta
        });

    } catch (error) {
        const firebaseError =
            error.response?.data?.error?.message;

        // Registra somente o código/mensagem do erro.
        // Não registra senha, token ou chave da API.
        if (firebaseError) {
            console.error(
                'Erro de autenticação Firebase:',
                firebaseError
            );

            const errosDeCredenciais = [
                'INVALID_LOGIN_CREDENTIALS',
                'EMAIL_NOT_FOUND',
                'INVALID_PASSWORD',
                'USER_DISABLED'
            ];

            if (errosDeCredenciais.includes(firebaseError)) {
                return res.status(401).json({
                    msg: 'E-mail ou senha inválidos.'
                });
            }

            if (firebaseError === 'EMAIL_EXISTS') {
                return res.status(401).json({
                    msg: 'Não foi possível autenticar com esses dados.'
                });
            }

            if (
                firebaseError === 'API_KEY_INVALID' ||
                firebaseError === 'INVALID_API_KEY'
            ) {
                return res.status(500).json({
                    msg: 'A chave da API do Firebase está inválida.'
                });
            }

            if (
                firebaseError === 'OPERATION_NOT_ALLOWED'
            ) {
                return res.status(500).json({
                    msg: 'O método de login por e-mail e senha não está habilitado no Firebase.'
                });
            }

            return res.status(502).json({
                msg: 'O Firebase retornou um erro durante a autenticação.',
                codigo: firebaseError
            });
        }

        if (error.code === 'ECONNABORTED') {
            console.error('Login: tempo limite de conexão com o Firebase.');

            return res.status(504).json({
                msg: 'O serviço de autenticação demorou para responder. Tente novamente.'
            });
        }

        console.error(
            'Erro interno no login:',
            error.message
        );

        return res.status(500).json({
            msg: 'Não foi possível realizar o login.'
        });
    }
});

// Solicitação de redefinição de senha
router.post('/reset-password', async (req, res) => {
    const { email } = req.body;

    if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
            msg: 'O e-mail é obrigatório.'
        });
    }

    try {
        const resetLink =
            await admin.auth().generatePasswordResetLink(email.trim());

        await enviarEmail(
            email.trim(),
            'Redefinição de senha',
            `<p>Olá! Para redefinir sua senha, acesse o link abaixo:</p>
             <p><a href="${resetLink}">Redefinir minha senha</a></p>`
        );

        return res.status(200).json({
            msg: 'Instruções para redefinição de senha enviadas.'
        });

    } catch (error) {
        console.error(
            'Erro ao redefinir senha:',
            error.code || error.message
        );

        return res.status(500).json({
            msg: 'Não foi possível processar a solicitação.'
        });
    }
});

// Geração do link de verificação de e-mail
router.post('/send-verification-email', async (req, res) => {
    const { email } = req.body;

    if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
            msg: 'O e-mail é obrigatório.'
        });
    }

    try {
        const verifyLink =
            await admin.auth().generateEmailVerificationLink(email.trim());

        return res.status(200).json({
            msg: 'Link de verificação gerado com sucesso.',
            link: verifyLink
        });

    } catch (error) {
        console.error(
            'Erro ao gerar link de verificação:',
            error.code || error.message
        );

        return res.status(500).json({
            msg: 'Não foi possível gerar o link de verificação.'
        });
    }
});

module.exports = router;
