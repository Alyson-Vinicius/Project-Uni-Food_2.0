const Produto = require('../models/Produto');
//const bucket = require('../config/firebaseConfig');
const mongoose = require('mongoose');
const Vendedor = require('../models/Vendedor');
class ProdutoController {
    async postProduto(req, res) {
        try {
            const { nome, descricao, ingredientes, vendedor } = req.body;

            const quantidade = Number(req.body.quantidade);
            const preco = Number(req.body.preco);
            const file = req.file;

            if (file) {
    return res.status(400).json({
        msg: "O envio de imagens está temporariamente desativado."
    });
}


            if (quantidade === undefined) {
                return res.status(400).json({ msg: "o campo quantidade esta undefined" });
            }
            if(descricao === undefined){
                return res.status(400).json({ msg: "O campo descrição esta undefined." });
            }
            if(!nome){
                return res.status(400).json({ msg: "O campo nome deve ser preenchido." });
            }
            if(!vendedor){  
                return res.status(400).json({ msg: "O campo vendedor deve ser preenchido." });
            }
            if(!preco || preco === undefined){
                return res.status(400).json({ msg: "O campo preço deve ser preenchido." });
            }
            if(!quantidade){
                return res.status(400).json({ msg: "O campo quantidade deve ser preenchido." });
            }

            if(!ingredientes){
                return res.status(400).json({ msg: "O campo ingredientes deve ser preenchido." });
            }
    
            if (descricao.length > 500) {
                return res.status(400).json({ msg: "A descrição não pode exceder 500 caracteres." });
            }
    
            if (preco < 0 || quantidade < 0) {
                return res.status(400).json({ msg: "Preço e quantidade devem ser valores positivos." });
            }
    
            let imageUrl = "";
    
            if (file) {
                const fileName = `produtos/${vendedor.toString()}_${Date.now()}_${file.originalname}`;
                const firebaseFile = bucket.file(fileName);
                const stream = firebaseFile.createWriteStream({
                    metadata: { contentType: file.mimetype }
                });
    
                stream.on("error", (err) => {
                    return res.status(500).json({ msg: "Erro ao fazer upload da imagem.", error: err });
                });
    
                stream.on("finish", async () => {
                    await firebaseFile.makePublic();
                    imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
                    const novoProduto = new Produto({
                        nome,
                        descricao,
                        ingredientes: ingredientes ? ingredientes.split(",") : [],
                        imagem: imageUrl,
                        preco,
                        quantidade,
                        vendedor: new mongoose.Types.ObjectId(vendedor)

                    });
    
                    await novoProduto.save();
                    return res.status(201).json({ msg: "Produto criado com sucesso!", produto: novoProduto });
                });
    
                stream.end(file.buffer);
            } else {
                const novoProduto = new Produto({
                    nome,
                    descricao,
                    ingredientes: ingredientes ? ingredientes.split(",") : [],
                    preco,
                    quantidade,
                    vendedor: new mongoose.Types.ObjectId(vendedor)

                });
    
                await novoProduto.save();
                return res.status(201).json({ msg: "Produto criado com sucesso!", produto: novoProduto });
            }
        } catch (error) {
            console.error("❌ Erro ao criar produto:", error);
            return res.status(500).json({ msg: "Erro ao criar o produto.", error });
        }
    }

    async getAllProdutos(req, res) {
        try {
            const produtos = await Produto.find().populate('vendedor', 'nome email');
            return res.status(200).json(produtos);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao recuperar produtos.', details: error.message });
        }
    }

    async getOneProduto(req, res) {
        try {
            const id = req.params.id;
            const produto = await Produto.findById(id).populate('vendedor', 'nome email');
            if (!produto) {
                return res.status(404).json({ msg: 'Produto não encontrado.' });
            }
            return res.status(200).json(produto);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao recuperar o produto.', details: error.message });
        }
    }

    async updateProduto(req, res) {
        try {
            const { produtoId } = req.params;
            const { nome, descricao, ingredientes, preco, quantidade } = req.body;
            console.log("Corpo da requisição recebido:", req.body);
            const novaImagem = req.file;
    
            // Verificar se o produto existe
            const produto = await Produto.findById(produtoId);
            if (!produto) {
                return res.status(404).json({ msg: "Produto não encontrado." });
            }
    
            // Atualizar dados básicos do produto (ignorando o campo "vendedor")
            if (nome) produto.nome = nome;
            if (descricao) produto.descricao = descricao;
            if (ingredientes) produto.ingredientes = ingredientes.split(",").map(i => i.trim());
            if (preco) produto.preco = preco;
            if (quantidade) produto.quantidade = quantidade;
            console.log("Produto após atualização dos campos:", produto);
    
            // Se houver uma nova imagem, faz o upload e remove a antiga
            if (novaImagem) {
                if (produto.imagem) {
                    const oldFile = bucket.file(produto.imagem.split("/").pop());
                    await oldFile.delete();
                    console.log("✅ Imagem antiga apagada:", produto.imagem);
                }
    
                // Define novo caminho da imagem
                const newImageName = `produtos/produto_${Date.now()}_${novaImagem.originalname}`;
                const file = bucket.file(newImageName);
    
                // Faz o upload da nova imagem
                await file.save(novaImagem.buffer, {
                    metadata: { contentType: novaImagem.mimetype },
                });
                await file.makePublic();
    
                // Atualiza a URL da imagem
                produto.imagem = `https://storage.googleapis.com/${bucket.name}/${newImageName}`;
            }
    
            console.log("Salvando produto...");
            await produto.save();
            console.log("Produto salvo com sucesso:", produto);
            return res.json({ msg: "Produto atualizado com sucesso!", produto });
        } catch (error) {
            console.error("❌ Erro ao atualizar produto:", error);
            return res.status(500).json({ msg: "Erro ao atualizar o produto.", error });
        }
    }
    async deleteProduto(req, res) {
        try {
            const id = req.params.id;
            const produto = await Produto.findByIdAndDelete(id);
            if (!produto) {
                return res.status(404).json({ msg: 'Produto não encontrado.' });
            }
            return res.status(200).json({ msg: 'Produto deletado com sucesso.', produto });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao deletar o produto.', details: error.message });
        }
    }

    // pegando todos os produtos de um vendedor
    async getProdutosByVendedor(req, res) {
        try {
            const id = req.params.id;
            const produtos = await Produto.find({ vendedor: id }).populate('vendedor', 'nome email');
            if (!produtos) {
                return res.status(404).json({ msg: 'Nenhum produto encontrado.' });
            }
            return res.status(200).json(produtos);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao recuperar os produtos.', details: error.message });
        }
    }
}



module.exports = new ProdutoController();
