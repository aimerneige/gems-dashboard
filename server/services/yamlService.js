const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class YamlService {
    constructor(config) {
        this.dataPath = path.resolve(config.storage.dataPath);
        this.gemsFile = path.join(this.dataPath, 'gems.yaml');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
        if (!fs.existsSync(this.gemsFile)) {
            fs.writeFileSync(this.gemsFile, '', 'utf8');
        }
    }

    getGems() {
        const content = fs.readFileSync(this.gemsFile, 'utf8');
        if (!content.trim()) {
            return [];
        }
        return yaml.load(content) || [];
    }

    saveGems(gems) {
        const yamlContent = yaml.dump(gems, { indent: 2, lineWidth: -1 });
        fs.writeFileSync(this.gemsFile, yamlContent, 'utf8');
    }

    addGem(gem) {
        const gems = this.getGems();
        const existingIndex = gems.findIndex(g => g.id === gem.id);
        if (existingIndex >= 0) {
            gems[existingIndex] = { ...gems[existingIndex], ...gem };
        } else {
            gems.push(gem);
        }
        this.saveGems(gems);
        return gems;
    }

    updateGem(id, updates) {
        const gems = this.getGems();
        const index = gems.findIndex(g => g.id === id);
        if (index >= 0) {
            gems[index] = { ...gems[index], ...updates };
            this.saveGems(gems);
            return gems[index];
        }
        return null;
    }

    deleteGem(id) {
        const gems = this.getGems();
        const filtered = gems.filter(g => g.id !== id);
        this.saveGems(filtered);
        return filtered;
    }

    getGemById(id) {
        const gems = this.getGems();
        return gems.find(g => g.id === id) || null;
    }
}

module.exports = YamlService;