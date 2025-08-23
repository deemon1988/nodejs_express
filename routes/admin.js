const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin");
const emailController = require('../controllers/email')
const upload = require("../config/multerConfig");
const isAuth = require("../middleware/is-auth");
const isAdmin = require("../middleware/is-admin");
const csrf = require("csurf");
const csrfProtection = csrf();
const { body } = require("express-validator");
const { deleteFile } = require("../util/fileUtils");

router.get(
  "/posts",
  csrfProtection,
  isAuth,
  isAdmin,
  adminController.getAllPosts
);

router.delete("/delete-post/:postId", csrfProtection, isAuth, isAdmin, adminController.deletePost);

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
  [
    body("title", "Минимальная длина заголовка 5 символов").isLength({
      min: 5,
    }),
    body("fileUrl", "Укажите ссылку для скачивания")
      .notEmpty()
      .isURL()
      .withMessage('Введите корректный URL адрес ссылки для скачивания'),
    body("preview", "Превью не может быть пустым").notEmpty(),
    body("content", "Описание не может быть пустым").notEmpty(),
    body("category", "Категория не выбрана").notEmpty(),
  ],
  adminController.postAddGuide)

router.get('/api/yandex-disk-start', csrfProtection, isAuth, isAdmin, adminController.yandexDiskAuth)
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
  upload.single("image"),
  csrfProtection,
  isAuth,
  isAdmin,
  adminController.postEditCategory
);
router.post(
  "/create-category",
  upload.single("image"),
  isAuth,
  isAdmin,

  adminController.postCreateCategory
);

router.post("/create-alias", isAuth, isAdmin, adminController.postCreateAlias);
router.post("/edit-alias", isAuth, isAdmin, adminController.postEditAlias);

router.post(
  "/delete-category/:categoryId",
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

router.get('/delete-file', async (req, res) => {
  try {
    const filePath = req.query.path
    const {success, message} = await deleteFile(filePath)
    if(!success) throw new Error(message)
    
    res.status(200).json({
      success: true
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({
      success: false,
      message: err.message
    })
  }
})

router.get('/messages', csrfProtection, isAuth, isAdmin, emailController.getReplyToUser)
router.get('/messages/:threadId', csrfProtection, isAuth, isAdmin, emailController.getThreadMessages)
router.post('/messages/:messageId/reply', csrfProtection, isAuth, isAdmin, emailController.postReplyToUser)
router.post('/messages/:messageId/status', csrfProtection, isAuth, isAdmin, emailController.postMessageStatus)
router.post('/messages/:messageId/delete', csrfProtection, isAuth, isAdmin, emailController.postDeleteMessage)

module.exports = router;
