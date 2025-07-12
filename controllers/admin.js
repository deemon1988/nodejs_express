const Post = require("../models/post");

exports.getAddPost = (req, res, next) => {
  res.render("admin/edit-post", {
    pageTitle: "Создать пост",
    path: "/admin/create-post",
    editing: false,
  });
};

exports.postAddPost = (req, res, next) => {
  const id = null;
  const title = req.body.title;
  const content = req.body.content;
  const category = req.body.category;
  const image = "/images/posts/" + req.file.filename;

  const post = new Post(id, title, content, category, image);

  post.save();
  res.redirect("/");
};

exports.postDeletePost = (req, res, next) => {
  const postId = req.body.postId
  Post.delete(postId)
  res.redirect('/admin/posts')
}


exports.getAllPosts = (req, res, next) => {
  Post.fetchAll((posts) => {
    res.render("admin/posts", {
      pageTitle: "Админ посты",
      posts: posts,
      path: "/admin/posts",
    });
  });
};

exports.getEditPost = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/posts");
  }
  const postId = req.params.postId;
  Post.findByID(postId, (post) => {
    if (!post) {
      return res.redirect("/posts");
    }
    res.render("admin/edit-post", {
      pageTitle: "Редактировать пост",
      path: "/admin/edit-post",
      editing: editMode,
      post: post,
    });
  });
};

exports.postEditPost = (req, res, next) => {
  const postId = req.body.postId;
  const updatedTitle = req.body.title;
  const updatedContent = req.body.content;
  const updatedCategory = req.body.category;
  const updatedImage = "/images/posts/" + req.file.filename;

  const updatedPost = new Post(
    postId,
    updatedTitle,
    updatedContent,
    updatedCategory,
    updatedImage
  );
  updatedPost.save(postId);
  res.redirect("/admin/posts");
};
