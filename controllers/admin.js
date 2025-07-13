const Post = require("../models/post");

exports.getAddPost = (req, res, next) => {
  res.render("admin/edit-post", {
    pageTitle: "Создать пост",
    path: "/admin/create-post",
    editing: false,
  });
};

exports.postAddPost = (req, res, next) => {
  const title = req.body.title;
  const content = req.body.content;
  const category = req.body.category;

  if (!req.file) {
    res.redirect("/admin/create-post");
  }
  const image = "/images/posts/" + req.file.filename;

  req.user
    .createPost({
      title: title,
      content: content,
      category: category,
      image: image,
    })

    .then((result) => res.redirect("/admin/posts"))
    .catch((err) => console.log(err));
};

exports.postDeletePost = (req, res, next) => {
  const postId = req.body.postId;
  Post.findByPk(postId)
    .then((post) => {
      return post.destroy();
    })
    .then((result) => {
      res.redirect("/admin/posts");
    })
    .catch((err) => console.log(err));
};

exports.getAllPosts = (req, res, next) => {
  Post.findAll()
    .then((posts) => {
      res.render("admin/posts", {
        pageTitle: "Админ посты",
        posts: posts,
        path: "/admin/posts",
      });
    })
    .catch((err) => console.log(err));
};

exports.getEditPost = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/admin/posts");
  }
  const postId = req.params.postId;
  // req.user.getPosts({where: {id: postId}})
  Post.findByPk(postId)
    .then((post) => {
      // const post = posts[0]
      if (!post) {
        return res.redirect("/admin/posts");
      }
      res.render("admin/edit-post", {
        pageTitle: "Редактировать пост",
        path: "/admin/edit-post",
        editing: editMode,
        post: post,
      });
    })
    .catch((err) => console.log(err));
};

exports.postEditPost = (req, res, next) => {
  const postId = req.body.postId;
  const updatedTitle = req.body.title;
  const updatedContent = req.body.content;
  const updatedCategory = req.body.category;

  Post.findByPk(postId)
    .then((post) => {
      let imageUrl = post.image;
      post.title = updatedTitle;
      post.content = updatedContent;
      post.category = updatedCategory;
      if (req.file) imageUrl = "/images/posts/" + req.file.filename;
      post.image = imageUrl;
      return post.save();
    })
    .then((result) => res.redirect("/admin/posts"))
    .catch((err) => console.log(err));
};
