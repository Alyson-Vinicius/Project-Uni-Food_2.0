const express = require('express');
const pictureRouter = require("./picture");
const authRouter = require('./auth');
const vendedorRouter = require('./vendedor');
const clienteRouter = require('./cliente');
const produtoRouter = require('./produtos');
const pedidoRouter = require('./pedidos');
//const testeRouter = require('./teste');


const router = express.Router();

// Rota Pública
router.get('/', (req, res) => {
    res.status(200).json({ msg: 'Bem-vindo à nossa API' });
});

// Usar as outras rotas
router.use('/cliente', clienteRouter);  // Rota de cliente
router.use('/vendedor', vendedorRouter);    // Rota de vendedor
router.use('/produto', produtoRouter);  // Rota de produto
router.use('/pictures', pictureRouter); // Rota de imagens
router.use('/auth', authRouter);    // Rota de autenticação
router.use('/pedidos', pedidoRouter); // Rota de pedidos
//router.use('/', testeRouter);  // Rota de teste


module.exports = router;