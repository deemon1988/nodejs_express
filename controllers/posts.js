const { formatDate, formatDateOnly } = require("../util/date");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Profile = require("../models/profile");
const User = require("../models/user");
const UserActivity = require("../models/user-activity");
const Like = require("../models/like");
const { fn, col, literal, Op } = require("sequelize");
const Category = require("../models/category");
const { Sequelize } = require("sequelize");
const sequelize = require("../util/database"); // замените на ваш путь
const { getPostsQuery } = require("../services/postService");

exports.getIndexPage = (req, res, next) => {
  // Post.findAll({
  //    attributes: {
  //       include: [
  //         [fn("COUNT", literal(' "comments"."id"')), "commentsCount"],
  //       ],
  //     },
  //   include: [
  //     {
  //       model: Comment,
  //       as: "comments",
  //       attributes: [],
  //       required: false,
  //     },
  //     {
  //       model: Category,
  //       as: "category",
  //     },
  //   ],
  //   group: ["post.id", "category.id"],
  //   order: [
  //     ["likes", "DESC"],
  //     [literal('"commentsCount"'), "DESC"],
  //   ],
  // })
  getPostsQuery()
    .then(({ rows: posts }) => {
      return posts.map((p) => p.toJSON());
    })
    .then((serializedPosts) => {
      res.render("blog/blog", {
        pageTitle: "Главная страница",
        posts: serializedPosts,
        path: "/",
      });
    })
    .catch((err) => console.log(err));
};

exports.getTopPosts = (req, res, next) => {
  sequelize
    .query(
      `
WITH ranked_posts AS (
  SELECT
    "post"."id",
    "post"."title",
    "post"."likes",
    "post"."categoryId",
    "post"."image",
    "post"."createdAt",
    "category"."name" AS "categoryName",
    COUNT("comments"."id") AS "commentsCount",
    ROW_NUMBER() OVER (
      PARTITION BY "post"."categoryId"
      ORDER BY "post"."likes" DESC, COUNT("comments"."id") DESC
    ) AS "rank"
  FROM "posts" AS "post"
  LEFT JOIN "comments" AS "comments" ON "post"."id" = "comments"."postId"
  LEFT JOIN "categories" AS "category" ON "post"."categoryId" = "category"."id"
  GROUP BY "post"."id", "post"."categoryId", "category"."name"
)
SELECT * FROM ranked_posts
WHERE "rank" = 1
ORDER BY "likes" DESC, "commentsCount" DESC;
  `,
      { type: Sequelize.QueryTypes.SELECT }
    )
    .then((posts) => {
      res.render("blog/blog", {
        pageTitle: "Топ постов по категориям",
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
        as: "category",
      },
    ],
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

exports.getAllPosts = async (req, res, next) => {
  const userId = req.user ? req.user.id : null;

  // try {
  //   const posts = await Post.findAll({
  //     attributes: {
  //       include: [
  //         [fn("COUNT", literal('DISTINCT "comments"."id"')), "commentsCount"],
  //         [fn("COUNT", literal('DISTINCT "likedUsers"."id"')), "likesCount"],
  //       ],
  //     },
  //     include: [
  //       {
  //         model: Comment,
  //         as: "comments",
  //         attributes: [],
  //         required: false,
  //       },
  //       {
  //         model: User,
  //         as: "likedUsers",
  //         attributes: ["id"], // нужно, чтобы мы могли проверить id
  //         through: { attributes: [] },
  //         where: { id: userId }, //userId ? { id: userId } : undefined,
  //         required: false,
  //       },
  //       {
  //         model: Category,
  //         as: "category",
  //       },
  //     ],
  //     group: ["post.id", "likedUsers.id", "category.id"], // обязательно указывать likedUsers.id для GROUP BY
  //     order: [
  //       // [literal("post.likes"), "DESC"],
  //       [literal('"likesCount"'), "DESC"],
  //       [literal('"commentsCount"'), "DESC"],
  //       ["createdAt", "DESC"],
  //     ],
  //   });
  getPostsQuery(userId)
    .then(({ rows: posts }) => {
      return posts.map((p) => p.toJSON());
    })
    // const serializedPosts = posts.map((p) => p.toJSON());
    .then((serializedPosts) => {
      res.render("blog/posts-list", {
        pageTitle: "Посты",
        posts: serializedPosts,
        path: "/posts",
      });
    })
    .catch((err) => console.error(err.message));
  // } catch (err) {
  //   console.error(err.message);
  //   next(err);
  // }
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
  const catId = req.query.cat;
  let category;
  Category.findByPk(catId)
    .then((cat) => {
      category = cat;
      return Post.findAll({
        where: { categoryId: catId },
        include: [{ model: Category, as: "category" }],
      });
    })

    .then((posts) => {
      res.render(`blog/category/${category.name}`, {
        posts: posts,
        pageTitle: category.name.toUpperCase(),
        path: "/categories",
      });
    });
};

exports.getCategories = (req, res, next) => {
  Post.findAll({
    include: [{ model: Category, as: "category" }],
    order: [["likes", "DESC"]],
  })
    .then((posts) => {
      res.render("blog/categories", {
        pageTitle: "Категории",
        path: "/categories",
        posts: posts,
        formatDate: formatDateOnly,
      });
    })
    .catch((err) => console.log(err));
};
