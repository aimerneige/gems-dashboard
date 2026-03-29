const express = require('express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const YamlService = require('./services/yamlService');
const createUploadMiddleware = require('./middleware/uploadMiddleware');
const gemsRoutes = require('./routes/gems');
const uploadRoutes = require('./routes/upload');

const app = express();
const configPath = path.join(__dirname, '..', 'config.yaml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const yamlService = new YamlService(config);
const uploadMiddleware = createUploadMiddleware(config);

gemsRoutes.init(yamlService);
uploadRoutes.init(config, uploadMiddleware, yamlService);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/images', express.static(path.join(__dirname, '..', config.storage.imagesPath)));

app.use('/api/gems', gemsRoutes.router);
app.use('/api/upload', uploadRoutes.router);

app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        data: {
            appTitle: config.app.title,
            appDescription: config.app.description
        }
    });
});

const host = config.server.host || '0.0.0.0';
const port = config.server.port || 3000;

app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
});