const { formatDate } = require("../util/date");
// const { where } = require("sequelize");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Profile = require("../models/profile");
const User = require("../models/user");
const UserActivity = require("../models/user-activity");
const Like = require("../models/like");

exports.getPosts = (req, res, next) => {
  const isLoggedIn = req.session.isLoggedIn
  Post.findAll()
    .then((posts) => {
      res.render("blog/blog", {
        pageTitle: "Главная страница",
        posts: posts,
        path: "/",
        isAuthenticated: isLoggedIn,

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
        order: [["createdAt", "DESC"]],
      });
    })
    .then((comments) => {
      res.render("blog/single", {
        post: loadedPost,
        pageTitle: loadedPost.title,
        comments: comments,
        formatDate: formatDate,
        userId: req.user.id,
        path: "/posts",
      });
    })
    .catch((err) => console.error(err));
};

exports.getAllPosts = (req, res, next) => {
  const userId = req.user.id;
  Post.findAll({
    include: [
      {
        model: Comment,
        as: "comments",
        required: false,
      },
      {
        model: User,
        as: "likedUsers",
        where: { id: userId },
        required: false,
      },
    ],
  })
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
  let createdPost;
  let profileId;
  Profile.findByPk(userId).then((profile) => {
    profileId = profile.id;
    Post.findByPk(postId)
      .then((post) => {
        createdPost = post;
        return Comment.create({
          text: commentText,
          postId: postId,
          userId: userId,
          profileId: profileId,
        });
      })
      .then((comment) => {
        return UserActivity.findOne({
          where: {
            profileId,
            actionType: "comment_added",
            targetType: "post",
            targetId: postId,
          },
        })
          .then((activity) => {
            if (!activity) {
              UserActivity.create({
                actionType: "comment_added",
                targetId: postId,
                targetType: "post",
                description: `Прокомментировал статью "${createdPost.title}"`,
                profileId,
              });
            } else {
              activity.update({
                description: `Комментарий обновлён: "${commentText}"`,
                updatedAt: new Date(),
              });
            }
          })
          .then((result) => {
            console.log("Comment added");
            res.redirect(`/single/${postId}#comments`);
          })
          .catch((err) => console.log(err));
      });
  });
};

exports.postDeleteComment = (req, res, next) => {
  const postId = req.body.postId;
  const commentId = req.body.commentId;
  const userId = req.user.id;

  Comment.findByPk(commentId)
    .then((comment) => {
      console.log(comment);
      return comment.destroy();
    })
    .then((result) => {
      res.redirect(`/single/${postId}`);
    })
    .catch((err) => console.log(err));
};

exports.postLike = (req, res, next) => {
  const userId = req.user.id;
  const postId = req.params.postId;
  const like = req.query.like === "false";
  console.log(like);
  let likes = like ? 1 : -1;
  console.log(likes);

  let profileId;
  let targetPost;

  Post.findByPk(postId)
    .then((post) => {
      targetPost = post;
      return post.update({ likes: post.likes + likes });
    })
    .then((updatedPost) => {
      targetPost = updatedPost;
      return Like.findOne({ where: { userId: userId, postId: postId } });
    })
    .then((foundedLike) => {
      if (!foundedLike) {
        return Like.create({ isLiked: true, userId, postId });
      }
      return foundedLike.destroy();
      // return foundedLike.update({ isLiked: like });
    })
    .then((result) => {
      return res.json({ likes: targetPost.likes });
    })
    .catch((err) => {
      console.error(err);
    });
};
