const Vendedor = require("../models/Vendedor");
//const bucket = require("../config/firebaseConfig");

// Salvar imagem e associar a um vendedor
exports.createPerfil = async (req, res) => {
    try {
        const { vendedorId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ msg: "Nenhuma imagem foi enviada." });
        }

        const vendedor = await Vendedor.findById(vendedorId);
        if (!vendedor) {
            return res.status(404).json({ msg: "Vendedor não encontrado." });
        }

        const fileName = `vendedores/${vendedorId}_${Date.now()}.png`;
        const firebaseFile = bucket.file(fileName);
        await firebaseFile.save(file.buffer, { metadata: { contentType: file.mimetype } });
        await firebaseFile.makePublic();

        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        vendedor.imagemPerfil = imageUrl;
        await vendedor.save();

        res.json({ msg: "Imagem salva com sucesso!", imageUrl });
    } catch (error) {
        res.status(500).json({ msg: "Erro ao salvar imagem.", error });
    }
};

// Remover imagem de perfil
exports.removePerfil = async (req, res) => {
    try {
        const { vendedorId } = req.body;
        const vendedor = await Vendedor.findById(vendedorId);
        if (!vendedor) return res.status(404).json({ msg: "Vendedor não encontrado." });

        if (!vendedor.imagemPerfil) return res.status(400).json({ msg: "Nenhuma imagem para remover." });

        const imagePath = vendedor.imagemPerfil.replace(`https://storage.googleapis.com/${bucket.name}/`, "");
        try { await bucket.file(imagePath).delete(); } catch (error) {
            if (error.code !== 404) throw error;
        }

        vendedor.imagemPerfil = "";
        await vendedor.save();

        res.json({ msg: "Imagem removida com sucesso!" });
    } catch (error) {
        res.status(500).json({ msg: "Erro ao excluir imagem.", error });
    }
};

// Atualizar imagem de perfil
exports.updatePerfil = async (req, res) => {
    try {
        const { vendedorId } = req.body;
        const novaImagem = req.file;

        if (!novaImagem) return res.status(400).json({ msg: "Nenhuma imagem enviada." });
        const vendedor = await Vendedor.findById(vendedorId);
        if (!vendedor) return res.status(404).json({ msg: "Vendedor não encontrado." });

        if (vendedor.imagemPerfil) {
            const oldPath = vendedor.imagemPerfil.replace(`https://storage.googleapis.com/${bucket.name}/`, "");
            try { await bucket.file(oldPath).delete(); } catch (error) {
                if (error.code !== 404) throw error;
            }
        }

        const newFileName = `vendedores/${vendedorId}_${Date.now()}.png`;
        const file = bucket.file(newFileName);
        await file.save(novaImagem.buffer, { metadata: { contentType: novaImagem.mimetype } });
        await file.makePublic();

        vendedor.imagemPerfil = `https://storage.googleapis.com/${bucket.name}/${newFileName}`;
        await vendedor.save();

        res.json({ msg: "Imagem atualizada com sucesso!", imagemPerfil: vendedor.imagemPerfil });
    } catch (error) {
        res.status(500).json({ msg: "Erro ao atualizar a imagem.", error });
    }
};

// Buscar imagem de perfil
exports.getPerfil = async (req, res) => {
    try {
        const vendedor = await Vendedor.findById(req.params.id, "imagemPerfil");
        if (!vendedor || !vendedor.imagemPerfil) return res.status(404).json({ msg: "Imagem não encontrada." });
        res.json({ url: vendedor.imagemPerfil });
    } catch (error) {
        res.status(500).json({ msg: "Erro ao buscar a imagem.", error });
    }
};

exports.createCapa = async (req, res) => {
    try {
        const { vendedorId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ msg: "Nenhuma imagem foi enviada." });
        }

        const vendedor = await Vendedor.findById(vendedorId);
        if (!vendedor) {
            return res.status(404).json({ msg: "Vendedor não encontrado." });
        }

        const fileName = `vendedores/${vendedorId}_${Date.now()}.png`;
        const firebaseFile = bucket.file(fileName);
        await firebaseFile.save(file.buffer, { metadata: { contentType: file.mimetype } });
        await firebaseFile.makePublic();

        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        vendedor.imagemCapa = imageUrl;
        await vendedor.save();

        res.json({ msg: "Imagem salva com sucesso!", imageUrl });
    } catch (error) {
        res.status(500).json({ msg: "Erro ao salvar imagem.", error });
    }
};

// Remover imagem de perfil
exports.removeCapa = async (req, res) => {
    try {
        const { vendedorId } = req.body;
        const vendedor = await Vendedor.findById(vendedorId);
        if (!vendedor) return res.status(404).json({ msg: "Vendedor não encontrado." });

        if (!vendedor.imagemCapa) return res.status(400).json({ msg: "Nenhuma imagem para remover." });

        const imagePath = vendedor.imagemCapa.replace(`https://storage.googleapis.com/${bucket.name}/`, "");
        try { await bucket.file(imagePath).delete(); } catch (error) {
            if (error.code !== 404) throw error;
        }

        vendedor.imagemCapa = "";
        await vendedor.save();

        res.json({ msg: "Imagem removida com sucesso!" });
    } catch (error) {
        res.status(500).json({ msg: "Erro ao excluir imagem.", error });
    }
};

// Atualizar imagem de perfil
exports.updateCapa = async (req, res) => {
    try {
        const { vendedorId } = req.body;
        const novaImagem = req.file;

        if (!novaImagem) return res.status(400).json({ msg: "Nenhuma imagem enviada." });
        const vendedor = await Vendedor.findById(vendedorId);
        if (!vendedor) return res.status(404).json({ msg: "Vendedor não encontrado." });

        if (vendedor.imagemCapa) {
            const oldPath = vendedor.imagemCapa.replace(`https://storage.googleapis.com/${bucket.name}/`, "");
            try { await bucket.file(oldPath).delete(); } catch (error) {
                if (error.code !== 404) throw error;
            }
        }

        const newFileName = `vendedores/${vendedorId}_${Date.now()}.png`;
        const file = bucket.file(newFileName);
        await file.save(novaImagem.buffer, { metadata: { contentType: novaImagem.mimetype } });
        await file.makePublic();

        vendedor.imagemCapa = `https://storage.googleapis.com/${bucket.name}/${newFileName}`;
        await vendedor.save();

        res.json({ msg: "Imagem atualizada com sucesso!", imagemCapa: vendedor.imagemCapa });
    } catch (error) {
        res.status(500).json({ msg: "Erro ao atualizar a imagem.", error });
    }
};

// Buscar imagem de perfil
exports.getCapa = async (req, res) => {
    try {
        const vendedor = await Vendedor.findById(req.params.id, "imagemPerfil");
        if (!vendedor || !vendedor.imagemCapa) return res.status(404).json({ msg: "Imagem não encontrada." });
        res.json({ url: vendedor.imagemCapa });
    } catch (error) {
        res.status(500).json({ msg: "Erro ao buscar a imagem.", error });
    }
};

