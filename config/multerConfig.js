const multer = require("multer");
const path = require("path");
const { ensureDirectoryExists } = require("../util/createDir");

// Настройка multer
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // let uploadPath = "public/images"; // базовая папка
    let dir;

    // Определяем поддиректорию по URL или роуту
    if (req.path === "/create-post" || req.path === "/edit-post") {
      // Разные пути в зависимости от имени поля (name)
      if (file.fieldname === "image") {
        dir = path.join(__dirname, "../public/images/posts");
      } else if (file.fieldname === "cover") {
        dir = path.join(__dirname, "../public/images/posts/cover");
      } else if (file.fieldname === "gallery") {
        dir = path.join(__dirname, "../public/images/posts/gallery");
      } else {
        dir = path.join(__dirname, "../public/images/other");
      }
    } else if (req.path === "/add-guide" || req.path === "/edit-guide") {
      if (file.fieldname === "image") {
        dir = path.join(__dirname, "../public/images/guides");
      } else if (file.fieldname === "cover") {
        dir = path.join(__dirname, "../public/images/guides/cover");
      } else {
        dir = path.join(__dirname, "../public/images/other");
      }
    } else if (
      req.path === "/create-category" ||
      req.path === "/update-category"
    ) {
      dir = path.join(__dirname, "../public/images/category");
    } else if (req.path === "/user/edit-profile") {
      dir = path.join(__dirname, "../public/images/user");
    } else if (req.path === "/upload-image") {
      dir = path.join(__dirname, "../public/images/posts/tinymce");
    } else {
      dir = path.join(__dirname, "../public/images/other");
    }

    ensureDirectoryExists(dir);

    cb(null, dir); // Папка, куда будут сохраняться загруженные файлы
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Имя файла
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'image') {
    req.imageUploadAttempted = true;
  }
  if (file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png'
  ) {
    cb(null, true)
  } else {
    cb(null, false);
  }
}

const upload = multer({ storage: fileStorage, fileFilter: fileFilter });

module.exports = upload;
