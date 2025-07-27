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
} = require("../services/postService");
const { getRandomPosts } = require("../util/shuffle");
const Alias = require("../models/allowed-alias");
const { viewHistory } = require("../util/viewHistory");
const { getRecommendedPosts } = require("../util/recomendedPosts");
const { getAllPosts } = require("../util/allPostsPerPage");
const { getMergedPosts } = require("../util/mergedPosts");
const { getViewedPosts } = require("../util/viewedPosts");

exports.getIndexPage = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  const viewHistory = req.session.viewHistory || null;

  console.log("viewHistory:", viewHistory);
  const userId = req.user ? req.user.id : null;

  let allPostsJson = {};
  let topPosts;

  let allPostsData = await getAllPosts(page, 5);

  let unionPosts = await getMergedPosts(viewHistory, page, 5);
  
  let recomendetData = await getRecommendedPosts(viewHistory, page, 5);
  
  if (viewHistory) {
    let hasReset = false
    // если уже все посты из истории были добавлены, то обнуляем список
    if (req.session.addedViewedPosts.length === viewHistory.length) {
      req.session.addedViewedPosts = [];
       hasReset = true
      recomendetData.totalPages = Math.ceil(recomendetData.total / recomendetData.limit); 
    }
    // установка флага если это последняя страница с рекомендуемыми постами
    if (
      recomendetData.posts.length < 5 &&
      recomendetData.page === recomendetData.totalPages
    ) {
      req.session.isEmptyPage = true;
      // recomendetData.totalPages += 1;
    // установка флага если это последняя страница с рекомендуемыми постами
    } else if (
      recomendetData.posts.length === 5 &&
      recomendetData.page === recomendetData.totalPages
    ) {
      req.session.isEmptyPage = true;
      recomendetData.totalPages += 1;
    }


    // если флаг установлен, то можно добавлять посты
    if (recomendetData.posts.length < 5 && req.session.isEmptyPage) {
      // получаем id рекомендуемых постов, чтобы исключить их из списка последних постов
      const existRecomendetPostsIds = recomendetData.posts.map(post => post.id)
      console.log("Можно добавить посты в recomendetData.posts");

      // получаем историю просмотров без уже добавленных ранее постов
      let filteredViewHistory = viewHistory.filter(
        (id) => !req.session.addedViewedPosts.includes(id)
      );
      // если список был обнулен и есть список id постов с последней страницы то исключаем их
      if(req.session.lastesPostsOnPage) {
        filteredViewHistory = filteredViewHistory.filter(id => !req.session.lastesPostsOnPage.includes(id))
      }
      const viewedPosts = await getViewedPosts(filteredViewHistory);

      // если это последняя страница и есть список последних добавленных постов для этой страницы, 
      // то добавляем эти посты
      if(req.session.lastesPostsOnPage && recomendetData.page === recomendetData.totalPages) {
         const postsForLastPage = await getViewedPosts(req.session.lastesPostsOnPage);
           for (
        let i = 0;
        recomendetData.posts.length < 5 && i < postsForLastPage.length;
        i++
      ) {
        recomendetData.posts.push(postsForLastPage[i]);
         if(!req.session.addedViewedPosts.includes(postsForLastPage[i].id)){
          req.session.addedViewedPosts.push(postsForLastPage[i].id);
        }
        // req.session.addedViewedPosts.push(postsForLastPage[i].id);
      }
      } else {
        // в цикле добавляем до 5 постов к уже существующим рекомендуемым постам 
      for (
        let i = 0;
        recomendetData.posts.length < 5 && i < viewedPosts.length;
        i++
      ) {
        recomendetData.posts.push(viewedPosts[i]);
        if(!req.session.addedViewedPosts.includes(viewedPosts[i].id)){
          req.session.addedViewedPosts.push(viewedPosts[i].id);
        }
      }
      }
      

      // если это последняя страница с рекомендованными постами, 
      // то получаем id постов которые были добавлены
      if(recomendetData.page === recomendetData.totalPages){
        const lastAddedPosts =  recomendetData.posts.filter(post => !existRecomendetPostsIds.includes(post.id))
        const lastAddedPostsIds = lastAddedPosts.map(post => post.id)
        console.log(lastAddedPostsIds)
        req.session.lastesPostsOnPage = lastAddedPostsIds
        console.log( req.session.lastesPostsOnPage)

      }

       // увеличиваем страницу только если ещё не все посты добавлены (с учетом постов с последней страницы)
        if (recomendetData.page > recomendetData.totalPages && req.session.lastesPostsOnPage.length > 0 && hasReset) {
          req.session.addedViewedPosts.length += req.session.lastesPostsOnPage.length
        }
       if(  req.session.addedViewedPosts.length < viewHistory.length) {
        recomendetData.totalPages += 1;
      }

    // если флаг установлен, то можно добавлять посты
    } else if (recomendetData.posts.length === 0 && req.session.isEmptyPage) {
      
       // получаем историю просмотров без уже добавленных ранее постов
      let filteredViewHistory = viewHistory.filter(
        (id) => !req.session.addedViewedPosts.includes(id)
      );

      // исключаем посты с последней страницы 
      if(req.session.lastesPostsOnPage){
        filteredViewHistory = filteredViewHistory.filter(id => !req.session.lastesPostsOnPage.includes(id))
      }

      console.log("Отвильтрованная история без постов с последней странице - ",filteredViewHistory)
      const viewedPosts = await getViewedPosts(filteredViewHistory);

      // в цикле добавляем столько постов сколько получено из истории (максимум до 5 штук)
      for (
        let i = 0;
        recomendetData.posts.length < 5 && i < filteredViewHistory.length;
        i++
      ) {
        recomendetData.posts.push(viewedPosts[i]);
        req.session.addedViewedPosts.push(viewedPosts[i].id);
      }

      //
      if( req.session.addedViewedPosts.length < viewHistory.length) {
        recomendetData.totalPages += 1;
      }

      // если все посты были добавлены, то сохраняем id всех добавленных постов 
      //  if(req.session.addedViewedPosts.length === viewHistory.length){
      //   const lastAddedPostsIds =  recomendetData.posts.map(post =>  post.id)
      //   req.session.lastesPostsOnPage = [...lastAddedPostsIds]
      // }
    }
  }
    console.log(" Посты которые уже были добавленны :",  req.session.addedViewedPosts)
    console.log("req.session.lastesPostsOnPage =  ", req.session.lastesPostsOnPage);
  console.log("Посты на страницу:", recomendetData.posts.length);
  console.log("Страница:", recomendetData.page);
  console.log("viewHistory:", viewHistory);

  getPostsWithLikedUsersQuery(userId)
    .then(({ rows: posts }) => {
      allPostsJson["posts"] = posts.map((p) => p.toJSON());
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
        allPosts: viewHistory ? recomendetData : allPostsData,
        randomPosts: randomPosts,
        successMessage: req.flash("success"),
        path: "/",
        csrfToken: req.csrfToken(),
        recomendetPosts: recomendetData,
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
      console.log(comment);
      return comment.destroy();
    })
    .then((result) => {
      res.redirect(`/posts/${postId}`);
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
