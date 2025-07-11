

const Post = require("../models/post");



exports.getPosts = (req, res, next) => {
  Post.fetchAll((posts) => {
    console.log(posts);
    res.render("blog/blog", {
      pageTitle: "Главная страница",
      posts: posts,
      path: '/'
    });
  });
};

exports.getAllPosts = (req, res, next) => {
  Post.fetchAll((posts) => {
    console.log(posts);
    res.render("blog/posts-list", {
      pageTitle: "Посты",
      posts: posts,
      path: '/posts'
    });
  });
};
