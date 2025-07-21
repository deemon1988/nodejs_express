const express = require("express");

const router = express.Router();

const adminController = require("../controllers/admin");

const upload = require("../config/multerConfig");

router.get("/create-post", adminController.getAddPost);

router.get("/posts", adminController.getAllPosts);

router.get("/edit-post/:postId", adminController.getEditPost);

router.post("/delete-post", adminController.postDeletePost);

router.post(
  "/update-post",
  upload.single("image"),
  adminController.postEditPost
);

router.post(
  "/create-post",
  upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  // { name: 'gallery', maxCount: 5 }
]),
  adminController.postAddPost
);

router.get("/create-category", adminController.getCreateCategory);
router.get("/edit-category/:categoryId", adminController.getEditCategory);
router.post("/update-category", upload.single("image"), adminController.postEditCategory);
router.post("/create-category", upload.single("image"), adminController.postCreateCategory);
router.post("/create-alias", adminController.postCreateAlias);


module.exports = router;
