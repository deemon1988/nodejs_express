

const Post = require("../models/post");



exports.getPosts = (req, res, next) => {
  Post.fetchAll((posts) => {
    res.render("blog/blog", {
      pageTitle: "Главная страница",
      posts: posts,
      path: '/'
    });
  });
};

exports.getPostById = (req, res, next) => {
  const postId = req.params.postId
  Post.findByID(postId, post => {
    res.render('blog/single', {post: post, pageTitle: post.title, path: '/posts'})
  })
};



exports.getAllPosts = (req, res, next) => {
  Post.fetchAll((posts) => {
    res.render("blog/posts-list", {
      pageTitle: "Посты",
      posts: posts,
      path: '/posts'
    });
  });
};
