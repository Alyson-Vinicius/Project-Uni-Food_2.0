const Cliente = require('../models/Cliente');
//const admin = require('../config/firebaseConfig');
const bcrypt = require('bcryptjs');

class ClienteController {
    async postCliente(req, res) {
        try {
            const cliente = new Cliente(req.body);
            await cliente.save();

            const { senha, ...clienteSemSenha } = cliente.toObject();
            return res.status(201).json(clienteSemSenha);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao criar cliente.", details: error.message });
        }
    }

    async getAllClientes(req, res) {
        try {
            const clientes = await Cliente.find().select('-senha');
            return res.status(200).json(clientes);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao recuperar clientes.', details: error.message });
        }
    }

    async getOneCliente(req, res) {
        try {
            const id = req.params.id;
            const cliente = await Cliente.findById(id).select('-senha');

            return res.status(200).json(cliente);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao buscar cliente.', details: error.message });
        }
    }

    async updateCliente(req, res) {
        try {
            const id = req.params.id;
            const cliente = await Cliente.findById(id);
            Object.assign(cliente, req.body);
            await cliente.save();
            return res.status(200).json({ msg: 'Cliente atualizado com sucesso.', cliente });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao atualizar cliente.', details: error.message });
        }
    }

    async deleteCliente(req, res) {
        try {
            const { id } = req.params;
            const cliente = await Cliente.findByIdAndDelete(id);

            return res.status(200).json({ msg: 'Cliente deletado com sucesso.', cliente });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao deletar cliente.', details: error.message });
        }
    }
}

module.exports = new ClienteController();
