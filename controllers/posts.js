const { formatDate } = require("../util/date");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Profile = require("../models/profile");
const User = require("../models/user");
const UserActivity = require("../models/user-activity");
const Like = require("../models/like");

exports.getIndexPage = (req, res, next) => {
  Post.findAll({ order: [["likes", "DESC"]] })
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

  Post.findByPk(postId, {
    include: [
      {
        model: Category,
        as: 'category'
      }
    ]
  })
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

const { fn, col, literal, Op } = require("sequelize");
const Category = require("../models/category");

exports.getAllPosts = async (req, res, next) => {
  const userId = req.user ? req.user.id : null;

  try {
    const posts = await Post.findAll({
      attributes: {
        include: [
          [fn("COUNT", literal('DISTINCT "comments"."id"')), "commentsCount"],
          [fn("COUNT", literal('DISTINCT "likedUsers"."id"')), "likesCount"],
        ],
      },
      include: [
        {
          model: Comment,
          as: "comments",
          attributes: [],
          required: false,
        },
        {
          model: User,
          as: "likedUsers",
          attributes: ["id"], // нужно, чтобы мы могли проверить id
          through: { attributes: [] },
          where: { id: userId }, //userId ? { id: userId } : undefined,
          required: false,
        },
        {
          model: Category,
          as: 'category',
        },
      ],
      group: ["post.id", "likedUsers.id"], // обязательно указывать likedUsers.id для GROUP BY
      order: [
        [literal('"likesCount"'), "DESC"],
        [literal('"commentsCount"'), "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    const serializedPosts = posts.map((p) => p.toJSON());

    res.render("blog/posts-list", {
      pageTitle: "Посты",
      posts: serializedPosts,
      path: "/posts",
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// exports.getAllPosts = (req, res, next) => {
//   let userId = req.user ? req.user.id : null;
//   Post.findAll({
//     order: [["createdAt", "DESC"]],
//     include: [
//       {
//         model: Comment,
//         as: "comments",
//         required: false,
//       },
//       {
//         model: User,
//         as: "likedUsers",
//         where: { id: userId },
//         required: false,
//       },
//     ],
//   })
//     .then((posts) => {
//       res.render("blog/posts-list", {
//         pageTitle: "Посты",
//         posts: posts,
//         path: "/posts",
//       });
//     })
//     .catch((err) => console.log(err));
// };

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
  if (!req.user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const userId = req.user.id;
  const postId = req.params.postId;
  const like = req.query.like === "false";

  let likes = like ? 1 : -1;
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
    })
    .then((result) => {
      return res.json({ likes: targetPost.likes });
    })
    .catch((err) => {
      console.error(err);
    });
};

exports.getCategory = (req, res, next) => {
  const category = req.query.cat;
  Post.findAll({ where: { category: category } })
    .then((posts) => {
      res.render(`blog/cat/${category}`, {
        posts: posts,
        pageTitle: category.toUpperCase(),
        path: '/categories'
      });
    });
};
