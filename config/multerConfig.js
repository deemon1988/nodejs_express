const multer = require("multer");
const path = require("path");
const { ensureDirectoryExists } = require("../util/createDir");

// Настройка multer
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // let uploadPath = "public/images"; // базовая папка
    let dir;

    // Определяем поддиректорию по URL или роуту
    if (req.path === "/create-post" || req.path === "/update-post") {
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
    } else if (
      req.path === "/create-category" ||
      req.path === "/update-category"
    ) {
      dir = path.join(__dirname, "../public/images/category");
    } else if (req.path === "/user/edit-profile") {
      dir = path.join(__dirname, "../public/images/user");
    } else if (req.path === "/upload-image") {
      dir = path.join(__dirname, "../public/images/posts");
    } else {
      dir = path.join(__dirname, "../public/images/other");
    }

    ensureDirectoryExists(dir);

    // // Определяем поддиректорию по URL или роуту
    // if (req.path === "/create-post" || req.path === "/update-post") {
    //   // Разные пути в зависимости от имени поля (name)
    //   if (file.fieldname === "image") {
    //     uploadPath = path.join(uploadPath, "posts");
    //   } else if (file.fieldname === "cover") {
    //     uploadPath = path.join(uploadPath, "cover");
    //   } else {
    //     uploadPath = path.join(uploadPath, "other");
    //   }
    // } else if (req.path === "/create-category" || req.path === "/update-category") {
    //    uploadPath = path.join(uploadPath, "category");
    // }

    // else if (req.path === "/user/edit-profile") {
    //   uploadPath = path.join(uploadPath, "user");
    // }
    //  else {
    //   uploadPath = path.join(uploadPath, "other");
    // }

    cb(null, dir); // Папка, куда будут сохраняться загруженные файлы
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Имя файла
  },
});

const upload = multer({ storage: fileStorage });

module.exports = upload;
