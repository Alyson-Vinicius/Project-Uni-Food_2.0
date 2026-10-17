
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
        // Verifica se já existe um usuário com esse e-mail no MongoDB
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

        // Prepara os dados que serão salvos no MongoDB
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

        // Salva o usuário no MongoDB Atlas
        const user = new Model(dadosUsuario);
        await user.save();

        // Não retorna a senha nem outros dados desnecessários
        const usuarioResposta = user.toObject();
        delete usuarioResposta.senha;

        return res.status(201).json({
            msg: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} criado com sucesso!`,
            user: usuarioResposta
        });

    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error.message);

        // Se o Firebase criou a conta, mas o MongoDB falhou,
        // tenta remover a conta criada para evitar inconsistência.
        if (firebaseUID) {
            try {
                await admin.auth().deleteUser(firebaseUID);
            } catch (deleteError) {
                console.error(
                    'Não foi possível remover a conta do Firebase:',
                    deleteError.message
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

    if (!email || !senha) {
        return res.status(422).json({
            msg: 'Informe o e-mail e a senha.'
        });
    }

    try {
        if (!process.env.FIREBASE_API_KEY || !process.env.SECRET) {
            throw new Error('Configuração de autenticação ausente.');
        }

        // Autentica o usuário no Firebase
        const firebaseAuthUrl =
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;

        const { data } = await axios.post(firebaseAuthUrl, {
            email,
            password: senha,
            returnSecureToken: true
        });

        // Procura o usuário correspondente no MongoDB
        const user = await Model.findOne({
            firebaseUID: data.localId
        });

        if (!user) {
            return res.status(404).json({
                msg: 'Usuário autenticado no Firebase, mas não encontrado no banco de dados.'
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

        // Campos específicos de vendedor
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
        const firebaseError = error.response?.data?.error?.message;

        console.error(
            'Erro no login:',
            firebaseError || error.message
        );

        if (firebaseError) {
            return res.status(401).json({
                msg: 'E-mail ou senha inválidos.'
            });
        }

        return res.status(500).json({
            msg: 'Não foi possível realizar o login.'
        });
    }
});

// Solicitação de redefinição de senha
router.post('/reset-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            msg: 'O e-mail é obrigatório.'
        });
    }

    try {
        const resetLink =
            await admin.auth().generatePasswordResetLink(email);

        await enviarEmail(
            email,
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
            error.message
        );

        return res.status(500).json({
            msg: 'Não foi possível processar a solicitação.'
        });
    }
});

// Geração do link de verificação de e-mail
router.post('/send-verification-email', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            msg: 'O e-mail é obrigatório.'
        });
    }

    try {
        const verifyLink =
            await admin.auth().generateEmailVerificationLink(email);

        return res.status(200).json({
            msg: 'Link de verificação gerado com sucesso.',
            link: verifyLink
        });

    } catch (error) {
        console.error(
            'Erro ao gerar link de verificação:',
            error.message
        );

        return res.status(500).json({
            msg: 'Não foi possível gerar o link de verificação.'
        });
    }
});

module.exports = router;
