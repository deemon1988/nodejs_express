const multer = require('multer')
const path = require('path')

// Настройка multer
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'public/images'; // базовая папка
    // Определяем поддиректорию по URL или роуту
    if (req.path === '/create-post' || req.path === '/update-post') {
      uploadPath = path.join(uploadPath, 'posts');
    } else if (req.path === '/upload-avatar') {
      uploadPath = path.join(uploadPath, 'user-avatar');
    } else {
      uploadPath = path.join(uploadPath, 'other');
    }
    cb(null, uploadPath); // Папка, куда будут сохраняться загруженные файлы
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Имя файла
  },
});

const upload = multer({ storage: fileStorage });

module.exports = upload