const express = require("express");

const router = express.Router();

const adminController = require("../controllers/admin");

const upload = require("../config/multerConfig");

router.get("/create-post", adminController.getAddPost);

router.get("/posts", adminController.getAllPosts);

router.post(
  "/create-post",
  upload.single("image"),
  adminController.postAddPost
);

module.exports = router;
