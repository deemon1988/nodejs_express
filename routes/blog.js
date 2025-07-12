const express = require("express");

const postsController = require("../controllers/posts");

const router = express.Router();

router.get("/posts", postsController.getAllPosts);
router.get("/posts/:postId", postsController.getPostById);

router.get("/categories", (req, res, next) => {
  res.render("blog/categories", { pageTitle: "Категории", path: '/categories' });
});

router.get("/archive", (req, res, next) => {
  res.render("blog/archive", { pageTitle: "Архив", path: '/archive' });
});

router.get("/about", (req, res, next) => {
  res.render("blog/about", { pageTitle: "О блоге", path: '/about' });
});

router.get("/single", (req, res, next) => {
  res.render("blog/single", { pageTitle: "Страница поста"});
});



router.get("/", postsController.getPosts);

module.exports = router;
