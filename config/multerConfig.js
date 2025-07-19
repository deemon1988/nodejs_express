const multer = require("multer");
const path = require("path");

// Настройка multer
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "public/images"; // базовая папка
    // Определяем поддиректорию по URL или роуту
    if (req.path === "/create-post" || req.path === "/update-post") {
      // Разные пути в зависимости от имени поля (name)
      if (file.fieldname === "cover") {
        uploadPath = path.join(uploadPath, "posts");
      } else if (file.fieldname === "logo") {
        uploadPath = path.join(uploadPath, "icons");
      } else {
        uploadPath = path.join(uploadPath, "other");
      }
    } else if (req.path === "/create-category" || req.path === "/update-category") {
       uploadPath = path.join(uploadPath, "category");
    }
    
    
    else if (req.path === "/user/edit-profile") {
      uploadPath = path.join(uploadPath, "user");
    }
     else {
      uploadPath = path.join(uploadPath, "other");
    }
    cb(null, uploadPath); // Папка, куда будут сохраняться загруженные файлы
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Имя файла
  },
});

const upload = multer({ storage: fileStorage });

module.exports = upload;
