const express = require("express");
const postsController = require("../controllers/posts");
const router = express.Router();
const csrf = require('csurf');
const csrfProtection = csrf();

router.get("/posts", csrfProtection, postsController.getAllPosts);
router.get("/posts/:postId", csrfProtection, postsController.getPostById);
router.post("/post/:postId/like", postsController.postLike);

router.get("/categories", postsController.getCategories);

router.get("/category", postsController.getCategory)

router.get("/archive", (req, res, next) => {
  res.render("blog/archive", { pageTitle: "Архив", path: '/archive' });
});

router.get("/about", (req, res, next) => {
  res.render("blog/about", { pageTitle: "О блоге", path: '/about' });
});


router.post("/comment/:postId", postsController.postComment)
router.post("/posts/:postId/:commentId", postsController.postDeleteComment)


router.get("/", csrfProtection, postsController.getIndexPage);

module.exports = router;
