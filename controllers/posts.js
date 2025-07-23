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
  getPostsWithLikedUsersQuery,
  getTopPostsByCataegoryQuery,
  getRandomPostsFromTop5Query,
  getTopPosts,
  getTopCreatedAtPosts,
} = require("../services/postService");
const { getRandomPosts } = require("../util/shuffle");
const Alias = require("../models/allowed-alias");
const { viewHistory } = require("../util/viewHistory");

exports.getIndexPage = (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  let allPostsJson;
  let topPosts;

  getPostsWithLikedUsersQuery(userId)
    .then(({ rows: posts }) => {
      allPostsJson = posts.map((p) => p.toJSON());
      return getTopPostsByCataegoryQuery();
    })
    .then((posts) => {
      topPosts = posts; //posts.map((p) => p.toJSON());
      return getRandomPostsFromTop5Query();
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
        successMessage: req.flash("success"),
        path: "/",
        csrfToken: req.csrfToken(),
      });
    })

    .catch((err) => console.log(err));
};

exports.getPostById = (req, res, next) => {
  const postId = req.params.postId;
  let loadedPost;
  const userId = req.user ? req.user.id : null;

  Post.findByPk(postId, {
    include: [
      {
        model: Category,
        as: "category",
      },
      {
        model: User,
        as: "likedUsers",
        attributes: ["id"], // нужно, чтобы мы могли проверить id
        through: { attributes: [] },
        where: { id: userId }, //userId ? { id: userId } : undefined,
        required: false,
      },
    ],
  })
    .then((post) => {
      viewHistory(req, post.id);
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
        userId: userId,
        path: "/posts",
        csrfToken: req.csrfToken(),
      });
    })
    .catch((err) => console.error(err));
};

exports.getAllPosts = async (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  let allPosts;
  let topCreatedAtPosts;
  let randomPosts;
  getPostsWithLikedUsersQuery(userId)
    .then(({ rows: posts }) => {
      allPosts = posts.map((p) => p.toJSON());
      allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      randomPosts = getRandomPosts(allPosts, 6);
      return getTopCreatedAtPosts();
    })
    .then((posts) => {
      topCreatedAtPosts = posts;
      console.log(topCreatedAtPosts);
      return Category.findAll();
    })

    .then((categories) => {
      res.render("blog/posts-list", {
        pageTitle: "Посты",
        posts: allPosts,
        topPosts: topCreatedAtPosts,
        randomPosts: randomPosts,
        categories: categories,
        path: "/posts",
        csrfToken: req.csrfToken(),
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
  const userId = req.user ? req.user.id : null;
  const catId = req.query.cat;
  let category;
  let mostLikedPosts;
  let byDatePosts;
  let anotherPostsInCategory;
  let aliasName;

  Alias.findByPk(catId)
    .then((alias) => {
      if (!alias) {
        throw new Error("Alias не найден");
      }
      aliasName = alias.name;
      return Category.findByPk(catId);
    })
    // Category.findByPk(catId)
    .then((cat) => {
      category = cat;
      return getPostsWithLikedUsersQuery(userId, category.id);
    })
    .then(({ rows: posts }) => {
      const postsJson = posts.map((p) => p.toJSON());
      mostLikedPosts = [...postsJson].sort((a, b) => b.likes - a.likes);
      byDatePosts = [...postsJson].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
      anotherPostsInCategory = [...postsJson]
        .filter((post) => post.likes === 0)
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

      return Category.findAll();
    })
    .then((categories) => {
      res.render(`blog/category/${aliasName}`, {
        posts: mostLikedPosts,
        pageTitle: category.name,
        byDatePosts: byDatePosts.slice(0, 4),
        anotherPosts: getRandomPosts(anotherPostsInCategory, 5),
        categories: categories,
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
        randomPosts: getRandomPosts(allPosts, 5),
        categories: categoriesJson,
        formatDate: formatDateOnly,
      });
    })
    .catch((err) => console.log(err));
};
