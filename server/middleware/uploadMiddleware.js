const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function createUploadMiddleware(config) {
    const imagesPath = path.resolve(config.storage.imagesPath);

    if (!fs.existsSync(imagesPath)) {
        fs.mkdirSync(imagesPath, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, imagesPath);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const name = crypto.randomBytes(16).toString('hex');
            cb(null, `${name}${ext}`);
        }
    });

    const fileFilter = (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP and SVG are allowed.'), false);
        }
    };

    return multer({
        storage,
        fileFilter,
        limits: {
            fileSize: 5 * 1024 * 1024
        }
    });
}

module.exports = createUploadMiddleware;