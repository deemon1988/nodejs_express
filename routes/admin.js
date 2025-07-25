const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin");
const upload = require("../config/multerConfig");
const isAuth = require('../middleware/is-auth')
const isAdmin = require('../middleware/is-admin')
const csrf = require('csurf');
const csrfProtection = csrf();

router.get("/create-post", csrfProtection, isAuth, isAdmin, adminController.getAddPost);

router.get("/posts", csrfProtection, isAuth, isAdmin, adminController.getAllPosts);

router.get("/edit-post/:postId", csrfProtection, isAuth, isAdmin, adminController.getEditPost);

router.post("/delete-post", isAuth, isAdmin, adminController.postDeletePost);

router.post(
  "/update-post",
  upload.single("image"),
  isAuth, isAdmin,
  adminController.postEditPost
);

router.post(
  "/create-post",
  upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
  { name: 'gallery', maxCount: 5 }
]),
  isAuth, isAdmin,
  adminController.postAddPost
);

router.post(
  "/upload-image",
  isAuth, isAdmin,
  upload.single('file'),
  adminController.postAddImage
);


router.get("/create-category", csrfProtection, isAuth, isAdmin, adminController.getCreateCategory);
router.get("/edit-category/:categoryId", csrfProtection, isAuth, isAdmin, adminController.getEditCategory);
router.post("/update-category", isAuth, isAdmin, upload.single("image"), adminController.postEditCategory);
router.post("/create-category", isAuth, isAdmin, upload.single("image"), adminController.postCreateCategory);

router.post("/create-alias", isAuth, isAdmin, adminController.postCreateAlias);
router.post("/edit-alias", isAuth, isAdmin, adminController.postEditAlias);


module.exports = router;
