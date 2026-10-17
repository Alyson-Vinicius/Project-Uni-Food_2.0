
const Pedido = require('../models/Pedido');
const Produto = require('../models/Produto');
const Cliente = require('../models/Cliente');
const Vendedor = require('../models/Vendedor');
const mongoose = require('mongoose');

const enviarEmail = require('../config/emailService');

const idValido = (id) => mongoose.Types.ObjectId.isValid(id);

const enviarEmailSeguro = async (destinatario, assunto, mensagem) => {
    try {
        if (destinatario) {
            await enviarEmail(destinatario, assunto, mensagem);
        }
    } catch (error) {
        console.error('Não foi possível enviar o e-mail:', error.message);
    }
};

// Criar um pedido
exports.fazerPedido = async (req, res) => {
    const { clienteId, vendedorId, produtos } = req.body;

    if (!idValido(clienteId) || !idValido(vendedorId)) {
        return res.status(400).json({
            message: 'ID de cliente ou vendedor inválido.'
        });
    }

    if (!Array.isArray(produtos) || produtos.length === 0) {
        return res.status(400).json({
            message: 'Informe pelo menos um produto no pedido.'
        });
    }

    for (const item of produtos) {
        if (
            !item ||
            !idValido(item.produtoId) ||
            !Number.isInteger(item.quantidade) ||
            item.quantidade <= 0
        ) {
            return res.status(400).json({
                message: 'Cada produto deve possuir um ID válido e uma quantidade inteira maior que zero.'
            });
        }
    }

    const session = await mongoose.startSession();
    let pedidoCriado;

    try {
        await session.withTransaction(async () => {
            const cliente = await Cliente.findById(clienteId).session(session);
            if (!cliente) {
                const erro = new Error('Cliente não encontrado.');
                erro.status = 404;
                throw erro;
            }

            const vendedor = await Vendedor.findById(vendedorId).session(session);
            if (!vendedor) {
                const erro = new Error('Vendedor não encontrado.');
                erro.status = 404;
                throw erro;
            }

            let total = 0;
            const itensPedido = [];

            for (const item of produtos) {
                const produto = await Produto.findById(item.produtoId).session(session);

                if (!produto) {
                    const erro = new Error(`Produto não encontrado: ${item.produtoId}`);
                    erro.status = 404;
                    throw erro;
                }

                if (produto.quantidade < item.quantidade) {
                    const erro = new Error(
                        `Estoque insuficiente para o produto: ${produto.nome}`
                    );
                    erro.status = 400;
                    throw erro;
                }

                total += produto.preco * item.quantidade;

                itensPedido.push({
                    produto: produto._id,
                    quantidade: item.quantidade,
                    precoUnitario: produto.preco
                });

                produto.quantidade -= item.quantidade;
                await produto.save({ session });
            }

            const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const codigoPedido = Array.from(
                { length: 2 },
                () => caracteres[Math.floor(Math.random() * caracteres.length)]
            ).join('');

            const novoPedido = new Pedido({
                codigoPedido,
                cliente: clienteId,
                vendedor: vendedorId,
                produtos: itensPedido,
                total,
                status: 'Pendente'
            });

            await novoPedido.save({ session });

            pedidoCriado = {
                pedido: novoPedido.toObject(),
                clienteNome: cliente.nome,
                vendedorEmail: vendedor.email,
                total,
                codigoPedido
            };
        });

        await enviarEmailSeguro(
            pedidoCriado.vendedorEmail,
            'Novo Pedido Recebido!',
            `
                <h3>Novo Pedido Recebido!</h3>
                <p>Você recebeu um novo pedido de <strong>${pedidoCriado.clienteNome}</strong>.</p>
                <p><strong>Total:</strong> R$ ${pedidoCriado.total.toFixed(2)}</p>
                <p><strong>Código do Pedido:</strong> ${pedidoCriado.codigoPedido}</p>
                <p>Verifique seu painel de pedidos para mais detalhes.</p>
            `
        );

        return res.status(201).json({
            message: 'Pedido realizado com sucesso!',
            pedido: pedidoCriado.pedido
        });
    } catch (error) {
        console.error('Erro ao fazer pedido:', error.message);

        return res.status(error.status || 500).json({
            message: error.status ? error.message : 'Erro ao fazer pedido.'
        });
    } finally {
        await session.endSession();
    }
};

// Atualizar o status do pedido
exports.atualizarStatusPedido = async (req, res) => {
    try {
        const { pedidoId } = req.params;
        const { status } = req.body;

        if (!idValido(pedidoId)) {
            return res.status(400).json({ message: 'ID do pedido inválido.' });
        }

        if (!['Aceito', 'Finalizado'].includes(status)) {
            return res.status(400).json({
                message: 'Status inválido. Use "Aceito" ou "Finalizado".'
            });
        }

        const pedido = await Pedido.findById(pedidoId).populate('cliente');

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        if (!pedido.cliente) {
            return res.status(404).json({
                message: 'Cliente associado ao pedido não encontrado.'
            });
        }

        pedido.status = status;
        await pedido.save();

        await enviarEmailSeguro(
            pedido.cliente.email,
            `Seu Pedido foi ${status}`,
            `
                <h3>Seu pedido foi ${status}!</h3>
                <p>Olá ${pedido.cliente.nome}, seu pedido foi <strong>${status}</strong> pelo vendedor.</p>
                <p>Entre no aplicativo para mais detalhes.</p>
            `
        );

        return res.status(200).json({
            message: `Pedido ${status} com sucesso!`,
            pedido
        });
    } catch (error) {
        console.error('Erro ao atualizar status:', error.message);
        return res.status(500).json({
            message: 'Erro ao atualizar status do pedido.'
        });
    }
};

// Listar pedidos de um cliente
exports.listarPedidosCliente = async (req, res) => {
    try {
        const { clienteId } = req.params;

        if (!idValido(clienteId)) {
            return res.status(400).json({
                message: 'ID do cliente inválido.'
            });
        }

        const pedidos = await Pedido.find({ cliente: clienteId })
            .populate('produtos.produto');

        if (pedidos.length === 0) {
            return res.status(404).json({
                message: 'Nenhum pedido encontrado para este cliente.'
            });
        }

        const vendedoresIds = [
            ...new Set(pedidos.map(pedido => String(pedido.vendedor)))
        ];

        const vendedores = await Vendedor.find({
            _id: { $in: vendedoresIds }
        });

        const vendedoresMap = {};

        vendedores.forEach(vendedor => {
            vendedoresMap[String(vendedor._id)] = {
                chavePix: vendedor.chavePix || null,
                email: vendedor.email || null,
                telefone: vendedor.telefone || null
            };
        });

        const pedidosComInfo = pedidos.map(pedido => {
            const pedidoObj = pedido.toObject();
            const vendedorInfo =
                vendedoresMap[String(pedido.vendedor)] || {};

            return {
                ...pedidoObj,
                chavePix: vendedorInfo.chavePix || null,
                vendedorEmail: vendedorInfo.email || null,
                vendedorTelefone: vendedorInfo.telefone || null
            };
        });

        return res.status(200).json(pedidosComInfo);
    } catch (error) {
        console.error('Erro ao buscar pedidos do cliente:', error.message);

        return res.status(500).json({
            message: 'Erro ao buscar pedidos do cliente.'
        });
    }
};

// Listar pedidos pendentes de um vendedor
exports.listarPedidosVendedor = async (req, res) => {
    try {
        const { vendedorId } = req.params;

        if (!idValido(vendedorId)) {
            return res.status(400).json({
                message: 'ID do vendedor inválido.'
            });
        }

        const pedidos = await Pedido.find({
            vendedor: vendedorId,
            status: 'Pendente'
        })
            .populate('produtos.produto')
            .populate('cliente', 'nome email telefone');

        if (pedidos.length === 0) {
            return res.status(404).json({
                message: 'Nenhum pedido encontrado para este vendedor.'
            });
        }

        return res.status(200).json(pedidos);
    } catch (error) {
        console.error('Erro ao buscar pedidos do vendedor:', error.message);

        return res.status(500).json({
            message: 'Erro ao buscar pedidos do vendedor.'
        });
    }
};

// Cancelar pedido pendente e devolver os produtos ao estoque
exports.cancelarPedido = async (req, res) => {
    if (!idValido(req.params.pedidoId)) {
        return res.status(400).json({
            message: 'ID do pedido inválido.'
        });
    }

    const session = await mongoose.startSession();

    try {
        let pedidoCancelado;
        let dadosEmail;

        await session.withTransaction(async () => {
            const pedido = await Pedido.findById(req.params.pedidoId)
                .populate('cliente')
                .session(session);

            if (!pedido) {
                const erro = new Error('Pedido não encontrado.');
                erro.status = 404;
                throw erro;
            }

            if (pedido.status !== 'Pendente') {
                const erro = new Error(
                    'Pedido já foi processado e não pode ser cancelado.'
                );
                erro.status = 400;
                throw erro;
            }

            for (const item of pedido.produtos) {
                const produto = await Produto.findById(item.produto).session(session);

                if (!produto) {
                    const erro = new Error(
                        `Produto do pedido não encontrado: ${item.produto}`
                    );
                    erro.status = 404;
                    throw erro;
                }

                produto.quantidade += item.quantidade;
                await produto.save({ session });
            }

            pedido.status = 'Cancelado';
            await pedido.save({ session });

            pedidoCancelado = pedido.toObject();

            dadosEmail = {
                nome: pedido.cliente?.nome,
                email: pedido.cliente?.email
            };
        });

        await enviarEmailSeguro(
            dadosEmail?.email,
            'Seu Pedido foi Cancelado',
            `
                <h3>Seu pedido foi cancelado!</h3>
                <p>Olá ${dadosEmail?.nome || ''}, seu pedido foi cancelado.</p>
                <p>Entre no aplicativo para mais detalhes.</p>
            `
        );

        return res.status(200).json({
            message: 'Pedido cancelado com sucesso!',
            pedido: pedidoCancelado
        });
    } catch (error) {
        console.error('Erro ao cancelar pedido:', error.message);

        return res.status(error.status || 500).json({
            message: error.status ? error.message : 'Erro ao cancelar pedido.'
        });
    } finally {
        await session.endSession();
    }
};
