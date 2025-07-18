const Category = require("../models/category");
const Post = require("../models/post");
const Profile = require("../models/profile");
const User = require("../models/user");
const UserActivity = require("../models/user-activity");

exports.getAddPost = (req, res, next) => {
  res.render("admin/edit-post", {
    pageTitle: "Создать пост",
    path: "/admin/create-post",
    editing: false,
    isAuthenticated: req.session.isLoggedIn,
  });
};

exports.postAddPost = (req, res, next) => {
  const title = req.body.title;
  const content = req.body.content;
  const categoryName = req.body.category;
  const user = req.user;

  let createdPost;
  let category;
  if (!req.file) {
    res.redirect("/admin/create-post");
  }
  const image = "/images/posts/" + req.file.filename;

  Category.findOne({ where: { name: categoryName } })
    .then((findedCategory) => {
      if (!findedCategory) {
        return Category.create({ name: categoryName });
      }
      return findedCategory;
    })
    .then((cat) => {
      category = cat;
      return cat.save();
    })
    .then(() => {
      return user.createPost({
        title: title,
        content: content,
        image: image,
        likes: 0,
      });
    })
    .then((post) => {
      createdPost = post;
      return post.setCategory(category);
    })
    .then(() => {
      return Profile.findByPk(user.id);
    })
    .then((profile) => {
      UserActivity.create({
        profileId: profile.id,
        actionType: "post_created",
        targetType: "post",
        targetId: createdPost.id,
        description: `Добавлен пост "${createdPost.title}"`,
      });
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
  Post.findAll({ include: [{ model: Category, as: "category" }] })
    .then((posts) => {
      res.render("admin/posts", {
        pageTitle: "Админ посты",
        posts: posts,
        path: "/admin/posts",
        isAuthenticated: req.session.isLoggedIn,
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
        isAuthenticated: req.session.isLoggedIn,
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
