const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin");
const upload = require("../config/multerConfig");
const isAuth = require("../middleware/is-auth");
const isAdmin = require("../middleware/is-admin");
const csrf = require("csurf");
const csrfProtection = csrf();
const { body } = require("express-validator");

router.get(
  "/posts",
  csrfProtection,
  isAuth,
  isAdmin,
  adminController.getAllPosts
);

router.post("/delete-post", csrfProtection, isAuth, isAdmin, adminController.postDeletePost);

router.get(
  "/edit-post/:postId",
  csrfProtection,
  isAuth,
  isAdmin,
  adminController.getEditPost
);
router.post(
  "/edit-post",
  isAuth,
  isAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "cover", maxCount: 1 },
    { name: "gallery", maxCount: 5 },
  ]),
  csrfProtection,
  [
    body("title", "Минимальная длина заголовка 5 символов").isLength({
      min: 5,
    }),
    body("content", "Описание не может быть пустым").notEmpty(),
    body("category", "Категория не выбрана").notEmpty(),
  ],
  adminController.postEditPost
);

router.get(
  "/create-post",
  csrfProtection,
  isAuth,
  isAdmin,
  adminController.getAddPost
);
router.post(
  "/create-post",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "cover", maxCount: 1 },
    { name: "gallery", maxCount: 5 },
  ]),
  csrfProtection,
  isAuth,
  isAdmin,
  [
    body("title", "Минимальная длина заголовка 5 символов").isLength({
      min: 5,
    }),
    body("content", "Описание не может быть пустым").notEmpty(),
    body("category", "Категория не выбрана").notEmpty(),
  ],
  adminController.postAddPost
);

router.get('/add-guide',
  csrfProtection,
  isAuth,
  isAdmin,
  adminController.getAddGuide)

router.post('/add-guide', upload.fields([
  { name: "image", maxCount: 1 },
  { name: "cover", maxCount: 1 },
]),
csrfProtection,
  isAuth,
  isAdmin,
  adminController.postAddGuide)

router.get('/api/yandex-disk-start', csrfProtection, isAuth, isAdmin, adminController.getYandexDiskUrl)
router.get('/yandex/disk/callback', csrfProtection, isAuth, isAdmin, adminController.handleYandexCallback)
router.get('/api/yandex-disk-get-link', csrfProtection, isAuth, isAdmin, adminController.getDownloadLink)
router.get('/yandex/disk/download-pdf', csrfProtection, isAuth, isAdmin, adminController.getDownloadPdf)


router.post(
  "/upload-image",
  isAuth,
  isAdmin,
  upload.single("file"),
  adminController.postAddImage
);

router.get(
  "/create-category",
  csrfProtection,
  isAuth,
  isAdmin,
  adminController.getCreateCategory
);
router.get(
  "/edit-category/:categoryId",
  csrfProtection,
  isAuth,
  isAdmin,
  adminController.getEditCategory
);
router.post(
  "/update-category",
  isAuth,
  isAdmin,
  upload.single("image"),
  adminController.postEditCategory
);
router.post(
  "/create-category",
  isAuth,
  isAdmin,
  upload.single("image"),
  adminController.postCreateCategory
);

router.post("/create-alias", isAuth, isAdmin, adminController.postCreateAlias);
router.post("/edit-alias", isAuth, isAdmin, adminController.postEditAlias);

router.post(
  "/delete-category",
  csrfProtection,
  isAuth,
  isAdmin,
  adminController.postDeleteCategory
);

router.get(
  "/cancel-post-create",
  csrfProtection,
  adminController.postCancelPostCreate
)

module.exports = router;
