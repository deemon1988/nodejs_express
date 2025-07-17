const express = require("express");

const postsController = require("../controllers/posts");

const router = express.Router();

router.get("/posts", postsController.getAllPosts);
router.get("/posts/:postId", postsController.getPostById);
router.post("/post/:postId/like", postsController.postLike);

router.get("/categories", (req, res, next) => {
  res.render("blog/categories", { pageTitle: "Категории", path: '/categories' });
});

router.get("/category", postsController.getCategory)

router.get("/archive", (req, res, next) => {
  res.render("blog/archive", { pageTitle: "Архив", path: '/archive' });
});

router.get("/about", (req, res, next) => {
  res.render("blog/about", { pageTitle: "О блоге", path: '/about' });
});

router.get("/single/:postId", postsController.getPostById);

router.post("/single/:postId", postsController.postComment)
router.post("/single/:postId/:commentId", postsController.postDeleteComment)


router.get("/", postsController.getIndexPage);

module.exports = router;
