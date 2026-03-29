const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

let config;
let yamlService;

function init(cfg, uploadMiddleware, service) {
    config = cfg;
    yamlService = service;

    router.post('/:id', uploadMiddleware.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const gemId = req.params.id;
            const gem = yamlService.getGemById(gemId);

            if (!gem) {
                fs.unlinkSync(req.file.path);
                return res.status(404).json({ success: false, message: 'GEM not found' });
            }

            const imageUrl = `/images/${req.file.filename}`;
            yamlService.updateGem(gemId, { icon: imageUrl });

            res.json({
                success: true,
                data: {
                    icon: imageUrl,
                    filename: req.file.filename
                }
            });
        } catch (error) {
            if (req.file && req.file.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (e) {}
            }
            res.status(500).json({ success: false, message: error.message });
        }
    });

    router.delete('/:id', (req, res) => {
        try {
            const gemId = req.params.id;
            const gem = yamlService.getGemById(gemId);

            if (!gem) {
                return res.status(404).json({ success: false, message: 'GEM not found' });
            }

            if (gem.icon && gem.icon.startsWith('/images/')) {
                const filename = path.basename(gem.icon);
                const imagePath = path.join(path.resolve(config.storage.imagesPath), filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            yamlService.updateGem(gemId, { icon: null });

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
}

module.exports = { router, init };