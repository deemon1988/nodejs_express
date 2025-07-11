const Post = require("../models/post");

exports.getAddPost = (req, res, next) => {
  res.render("admin/create-post", {
    pageTitle: "Создать пост",
  });
};

exports.postAddPost = (req, res, next) => {
  const post = new Post(
    req.body.title,
    req.body.content,
    req.body.category,
    "/images/posts/" + req.file.filename
  );
  post.save();
  res.redirect("/");
};

exports.getAllPosts = (req, res, next) => {
  Post.fetchAll((posts) => {
    console.log(posts);
    res.render("admin/posts", {
      pageTitle: "Админ посты",
      posts: posts,
      path: '/admin/posts'
    });
  });
};