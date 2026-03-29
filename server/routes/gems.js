const express = require('express');
const router = express.Router();
const YamlService = require('../services/yamlService');

let yamlService;

function init(service) {
    yamlService = service;
}

router.get('/', (req, res) => {
    try {
        const gems = yamlService.getGems();
        res.json({ success: true, data: gems });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/:id', (req, res) => {
    try {
        const gem = yamlService.getGemById(req.params.id);
        if (gem) {
            res.json({ success: true, data: gem });
        } else {
            res.status(404).json({ success: false, message: 'GEM not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/', (req, res) => {
    try {
        const gem = req.body;
        if (!gem.id || !gem.name || !gem.url) {
            return res.status(400).json({ success: false, message: 'id, name and url are required' });
        }
        const gems = yamlService.addGem(gem);
        res.json({ success: true, data: gems });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const gem = yamlService.updateGem(req.params.id, req.body);
        if (gem) {
            res.json({ success: true, data: gem });
        } else {
            res.status(404).json({ success: false, message: 'GEM not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const gems = yamlService.deleteGem(req.params.id);
        res.json({ success: true, data: gems });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/batch', (req, res) => {
    try {
        const { gems } = req.body;
        if (!Array.isArray(gems)) {
            return res.status(400).json({ success: false, message: 'gems must be an array' });
        }
        const currentGems = yamlService.getGems();
        const merged = [...currentGems];
        for (const gem of gems) {
            const existingIndex = merged.findIndex(g => g.id === gem.id);
            if (existingIndex >= 0) {
                merged[existingIndex] = { ...merged[existingIndex], ...gem };
            } else {
                merged.push(gem);
            }
        }
        yamlService.saveGems(merged);
        res.json({ success: true, data: merged });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/sync', (req, res) => {
    try {
        const gems = yamlService.getGems();
        res.json({ success: true, data: gems });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = { router, init };