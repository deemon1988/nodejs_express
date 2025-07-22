const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin");
const upload = require("../config/multerConfig");
const isAuth = require('../middleware/is-auth')
const isAdmin = require('../middleware/is-admin')


router.get("/create-post", isAuth, isAdmin, adminController.getAddPost);

router.get("/posts", isAuth, isAdmin, adminController.getAllPosts);

router.get("/edit-post/:postId", isAuth, isAdmin, adminController.getEditPost);

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
  { name: 'cover', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  // { name: 'gallery', maxCount: 5 }
]),
  isAuth, isAdmin,
  adminController.postAddPost
);

router.get("/create-category", isAuth, isAdmin, adminController.getCreateCategory);
router.get("/edit-category/:categoryId", isAuth, isAdmin, adminController.getEditCategory);
router.post("/update-category", upload.single("image"), isAuth, isAdmin, adminController.postEditCategory);
router.post("/create-category", upload.single("image"), isAuth, isAdmin, adminController.postCreateCategory);

router.post("/create-alias", isAuth, isAdmin, adminController.postCreateAlias);
router.post("/edit-alias", isAuth, isAdmin, adminController.postEditAlias);


module.exports = router;
