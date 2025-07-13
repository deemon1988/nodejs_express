const { where } = require("sequelize");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Profile = require("../models/profile");
const User = require("../models/user");

exports.getPosts = (req, res, next) => {
  Post.findAll()
    .then((posts) => {
      res.render("blog/blog", {
        pageTitle: "Главная страница",
        posts: posts,
        path: "/",
      });
    })
    .catch((err) => console.log(err));
};

exports.getPostById = (req, res, next) => {
  const postId = req.params.postId;
  let loadedPost;
  Post.findByPk(postId)
    .then((post) => {
      loadedPost = post;
      return Comment.findAll({
        where: { postId: postId },
        include: [
          {
            model: Profile,
            include: [User], // Вложенное подключение User
          },
        ],
      });
    })
    .then((comments) => {
      res.render("blog/single", {
        post: loadedPost,
        pageTitle: loadedPost.title,
        comments: comments,
        path: "/posts",
      });
    })
    .catch((err) => console.error(err));
};

exports.getAllPosts = (req, res, next) => {
  Post.findAll()
    .then((posts) => {
      res.render("blog/posts-list", {
        pageTitle: "Посты",
        posts: posts,
        path: "/posts",
      });
    })
    .catch((err) => console.log(err));
};

exports.postComment = (req, res, next) => {
  const postId = req.body.postId;
  const userId = req.user.id;
  const commentText = req.body.comment;
  console.log(req.body.comment, postId, userId);
  Profile.findByPk(userId).then((profile) => {
    const profileId = profile.id;
    Post.findByPk(postId)
      .then((post) => {
        return Comment.create({
          text: commentText,
          postId: postId,
          userId: userId,
          profileId: profileId,
        });
      })
      .then((result) => {
        console.log("Comment added");
        res.redirect(`/single/${postId}`);
      })
      .catch((err) => console.log(err));
  });
};
