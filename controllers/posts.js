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
const {
  getPostsQuery,
  getTopPostsByCataegoryQuery,
  getRandomTop5ByCategoryQuery,
  getTopPosts,
} = require("../services/postService");
const { getRandomPosts } = require("../util/shuffle");

exports.getIndexPage = (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  let allPostsJson;
  let topPosts;

  getPostsQuery(userId)
    .then(({ rows: posts }) => {
      allPostsJson = posts.map((p) => p.toJSON());
      return getTopPosts();
    })
    .then((posts) => {
      topPosts = posts.map((p) => p.toJSON());
      return getRandomTop5ByCategoryQuery();
    })
    .then((posts) => {
      return getRandomPosts(posts, 5);
    })
    .then((randomPosts) => {
      res.render("blog/blog", {
        pageTitle: "Главная страница",
        topPosts: topPosts,
        posts: allPostsJson,
        randomPosts: randomPosts,
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
  let allPosts;
  let topPosts;
  let randomPosts;
  getPostsQuery(userId)
    .then(({ rows: posts }) => {
      allPosts = posts.map((p) => p.toJSON());
      randomPosts = getRandomPosts(allPosts, 6);
      return getTopPosts();
    })
    .then((posts) => {
      topPosts = posts;
      return Category.findAll();
    })

    .then((categories) => {
      res.render("blog/posts-list", {
        pageTitle: "Посты",
        posts: allPosts,
        topPosts: topPosts,
        randomPosts: randomPosts,
        categories: categories,
        path: "/posts",
        formatDate: formatDateOnly
      });
    })
    .catch((err) => console.error(err.message));
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
  let allPosts;
  Post.findAll({
    include: [{ model: Category, as: "category" }],
    order: [["likes", "DESC"]],
  })
    .then((posts) => {
      allPosts = posts;

      return Category.findAll({
        attributes: {
          include: [
            "id",
            "name",
            "image",
            [fn("COUNT", col("posts.id")), "postCount"],
            [fn("MAX", col("posts.createdAt")), "latestPostDate"],
          ],
        },
        include: [
          {
            model: Post,
            as: "posts", // укажите ассоциацию, как у вас
            attributes: [], // не нужны данные постов
          },
        ],
        group: ["category.id"],
        // order: [[literal("postCount"), "DESC"]],
      });
    })
    .then((categories) => {
      const categoriesJson = categories.map((c) => c.toJSON());
      res.render("blog/categories", {
        pageTitle: "Категории",
        path: "/categories",
        posts: allPosts,
        categories: categoriesJson,
        formatDate: formatDateOnly,
      });
    })
    .catch((err) => console.log(err));
};
