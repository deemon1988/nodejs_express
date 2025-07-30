const { formatDate, formatDateOnly } = require("../util/date");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Profile = require("../models/profile");
const User = require("../models/user");
const UserActivity = require("../models/user-activity");
const Like = require("../models/like");
const { fn, col, literal, Op } = require("sequelize");
const Category = require("../models/category");

const {
  getPostsWithLikedUsersQuery,
  getTopPostsByCataegoryQuery,
  getRandomPostsFromTop5Query,
  getTopPosts,
  getTopCreatedAtPosts,
  getAllPostsByDate,
} = require("../services/postService");
const { getRandomPosts } = require("../util/shuffle");
const Alias = require("../models/allowed-alias");
const { viewHistory } = require("../util/viewHistory");
const { getRecommendedPosts } = require("../util/recomendedPosts");
const { getAllPostsOnPage } = require("../util/allPostsPerPage");
const { getMergedPosts } = require("../util/mergedPosts");
const { getAllCategoriesWithPosts } = require("../services/categoryService");

exports.getIndexPage = async (req, res, next) => {
  let page = parseInt(req.query.page) || 1;
  const limit = 5;

  const viewHistory = req.session.viewHistory || null;

  console.log("viewHistory:", viewHistory);
  const userId = req.user ? req.user.id : null;

  // let allPostsJson = {};
  let topPosts;

  let allPostsData = await getAllPostsOnPage(userId, page, limit);

  const mergedPosts = await getMergedPosts(userId, viewHistory, page, limit);

  getPostsWithLikedUsersQuery(userId)
    .then(({ rows: posts }) => {
      // allPostsJson["posts"] = posts.map((p) => p.toJSON());
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
        allPosts: viewHistory ? mergedPosts : allPostsData,
        randomPosts: randomPosts,
        successMessage: req.flash("success"),
        path: "/",
        csrfToken: req.csrfToken(),
        // recomendetPosts: recomendetData,
      });
    })

    .catch((err) => console.log(err));
};

exports.getPostById = (req, res, next) => {
  let success = req.flash("success");
  let message = req.flash("error");
  success = success.length > 0 ? success[0] : null;
  message = message.length > 0 ? message[0] : null;

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
        where: { id: userId },
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
            model: User,
            include: [Profile], // Вложенное подключение Profile
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
        errorMessage: message,
        successMessage: success,
      });
    })
    .catch((err) => console.error(err));
};

exports.getAllPosts = async (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  let randomPosts;
  let allPosts;
  const viewHistory = req.session.viewHistory || null;
  let page = parseInt(req.query.page) || 1;
  const limit = 5;

  let topCreatedAtPosts;
  let recomendetPosts;
  // let recomendetData = await getRecommendedPosts(viewHistory, page, limit);

  getPostsWithLikedUsersQuery(userId)
    .then(({ rows: posts }) => {
      allPosts = posts.map((p) => p.toJSON());
      allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      randomPosts = getRandomPosts(allPosts, 6);
      if (viewHistory) {
        recomendetPosts = posts.filter(
          (post) => !viewHistory.includes(post.id)
        );
        recomendetPosts = getRandomPosts(recomendetPosts, 5);
      }
      return getTopCreatedAtPosts();
    })
    .then((posts) => {
      topCreatedAtPosts = posts;
      return Category.findAll();
    })

    .then((categories) => {
      res.render("blog/posts-list", {
        pageTitle: "Посты",
        posts: allPosts,
        topOrRecomendetPosts: viewHistory ? recomendetPosts : topCreatedAtPosts,
        randomPosts: randomPosts,
        categories: categories,
        path: "/posts",
        csrfToken: req.csrfToken(),
      });
    })
    .catch((err) => console.error(err.message));
};

exports.postComment = (req, res, next) => {
  const postId = req.params.postId;
  const userId = req.user.id;
  const commentText = req.body.comment;
  let createdPost;
  let profileId;
  Profile.findOne({ where: { userId: userId } }).then((profile) => {
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
            res.redirect(`/posts/${postId}#comments`);
          })
          .catch((err) => console.log(err));
      });
  });
};

exports.postDeleteComment = (req, res, next) => {
  const postId = req.params.postId;
  const commentId = req.params.commentId;

  Comment.findByPk(commentId)
    .then((comment) => {
      if (!comment) {
        throw new Error("Комментарий не найден");
      }
      if (comment.userId !== req.user.id) {
        req.flash("error", "У вас нет прав для удаления этого комментария");
        throw new Error("Комментарий не пренадлежит пользователю");
      }
      return comment.destroy();
    })
    .then((result) => {
      req.flash("success", "Комментарий был удален");
      res.redirect(`/posts/${postId}`);
    })
    .catch((err) => {
      console.log("Ошибка при удалении комментария", err.message);
       res.redirect(`/posts/${postId}`);
    });
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
  const userId = req.user ? req.user.id : null;
  let allPosts;

  getPostsWithLikedUsersQuery(userId)
    .then(({ rows: posts }) => {
      allPosts = posts;
      return getAllCategoriesWithPosts();
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
        csrfToken: req.csrfToken(),
      });
    })
    .catch((err) => console.log(err));
};

exports.getArchive = async (req, res, next) => {
  try {
    const categoriesWithPosts = await getAllCategoriesWithPosts();
    const allPostsByDate = await getAllPostsByDate();
    allPostsByDate.sort(
      (a, b) => new Date(a.dataValues.date) - new Date(b.dataValues.date)
    ),
      console.log(allPostsByDate);
    res.render("blog/archive", {
      pageTitle: "Архив",
      path: "/archive",
      csrfToken: req.csrfToken(),
      posts: allPostsByDate,
      categories: categoriesWithPosts,
    });
  } catch (error) {
    console.log("Ошибка рендеринга страницы:", error);
  }
};
