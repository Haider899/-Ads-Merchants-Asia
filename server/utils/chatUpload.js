const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '..', '..', 'client', 'assets', 'uploads', 'chat');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function isAllowedChatImage(mimetype, originalName) {
  return allowedMimeTypes.has(String(mimetype || '').toLowerCase()) &&
    allowedExtensions.has(path.extname(String(originalName || '')).toLowerCase());
}

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    callback(null, `chat-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedChatImage(file.mimetype, file.originalname)) {
      return callback(new Error('Only JPG, PNG, WEBP, or GIF images are allowed.'));
    }
    callback(null, true);
  }
});

function handleChatUpload(req, res, next) {
  upload.single('image')(req, res, err => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Image is too large. Maximum size is 10 MB.'
      : (err.message || 'Could not upload image.');
    return res.status(400).json({ success: false, message });
  });
}

function getAttachmentUrl(file) {
  return file ? `/client/assets/uploads/chat/${encodeURIComponent(file.filename)}` : null;
}

module.exports = { handleChatUpload, getAttachmentUrl, uploadDirectory, isAllowedChatImage };
