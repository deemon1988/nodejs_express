const express = require("express");
const postsController = require("../controllers/posts");
const router = express.Router();
const csrf = require('csurf');
const isAuth = require("../middleware/is-auth");
const csrfProtection = csrf();

router.get("/posts", csrfProtection, postsController.getAllPosts);
router.get("/posts/:postId", csrfProtection, postsController.getPostById);
router.post("/post/:postId/like", postsController.postLike);

router.get("/categories", csrfProtection, postsController.getCategories);

router.get("/category", postsController.getCategory)

router.get("/archive", csrfProtection, postsController.getArchive);

router.get("/about", csrfProtection, (req, res, next) => {
  res.render("blog/about", {csrfToken: req.csrfToken(), pageTitle: "О блоге", path: '/about' });
});

router.get("/library", csrfProtection,  postsController.getLibrary);

// Новый маршрут: проверка перед скачиванием
router.get('/library/download/:guideId', csrfProtection, isAuth, postsController.checkBeforeDownload);
// Маршрут для подписки
router.get('/subscribe-page', csrfProtection, isAuth, postsController.getSubscribe);
router.post('/subscribe', csrfProtection, isAuth, postsController.subscribe);
// Маршрут для скачивания файла
router.get("/library/:guideId", isAuth, postsController.getRenderGuide);
router.get("/library/guide/:guideId", isAuth, postsController.getGuide);


router.post("/comment/:postId", isAuth, postsController.postComment)
router.post("/posts/:postId/:commentId", isAuth, postsController.postDeleteComment)


router.get("/", csrfProtection, postsController.getIndexPage);

module.exports = router;
