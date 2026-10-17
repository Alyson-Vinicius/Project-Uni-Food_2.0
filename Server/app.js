
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Importar as rotas
const routes = require('./routes');

// Middlewares
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota inicial e demais rotas da API
app.use('/', routes);

// Conexão com o MongoDB Atlas
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error('Erro: MONGO_URI não foi definida no arquivo Server/.env');
    process.exit(1);
}

mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 60000,
})
.then(() => {
    console.log('Conectado ao MongoDB Atlas!');

    app.listen(3000, '0.0.0.0', () => {
        console.log('Servidor rodando na porta 3000!');
    });
})
.catch((err) => {
    console.error('Erro ao conectar ao MongoDB:', err.message);
    process.exit(1);
});
