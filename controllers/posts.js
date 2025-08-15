const { formatDate, formatDateOnly } = require("../util/date");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Profile = require("../models/profile");
const User = require("../models/user");
const UserActivity = require("../models/user-activity");
const Like = require("../models/like");
// const { fn, col, literal, Op } = require("sequelize");
const Category = require("../models/category");
const path = require('path')
const fs = require('fs')
const PDFDocument = require('pdfkit');

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
const { where } = require("sequelize");
const Guide = require("../models/guide");
const { formatFileSize, formatContentType } = require("../util/fileFeatures");
const { title } = require("process");
const { postsPagination, withLikePostsPagination } = require("../public/assets/js/pagination/main-page-pagination");
const Payment = require("../models/payment");

exports.getIndexPage = async (req, res, next) => {
  try {
    let page = +req.query.page || 1;
    const limit = 5;

    const viewHistory = req.session.viewHistory || null;
    const userId = req.user ? req.user.id : null;

    const allPostsData = await getAllPostsOnPage(userId, page, limit);
    const mergedPosts = await getMergedPosts(userId, viewHistory, page, limit);

    // const { rows: postsWithUserLike } = await getPostsWithLikedUsersQuery(userId)

    const { posts, currentPage, hasNextPage, hasPreviousPage, nextPage, previousPage, lastPage, totalPages } = await withLikePostsPagination(page, userId)

    const topPostInEachCategory = await getTopPostsByCataegoryQuery();
    const topTop5PostsFromEachCategory = await getRandomPostsFromTop5Query()

    res.render("blog/blog", {
      pageTitle: "Главная страница",
      topPosts: topPostInEachCategory,
      allPosts: posts,//viewHistory ? mergedPosts : allPostsData,
      randomTopPosts: getRandomPosts(topTop5PostsFromEachCategory, 5),
      successMessage: req.flash("success"),
      path: "/",
      csrfToken: req.csrfToken(),
      // recomendetPosts: recomendetData,
      currentPage: currentPage,
      hasNextPage: hasNextPage,
      hasPreviousPage: hasPreviousPage,
      nextPage: nextPage,
      previousPage: previousPage,
      lastPage: lastPage,
      totalPages: totalPages
    });
  } catch (error) {
    console.error("Ошибка рендеринга страницы: ", error)
    const err = new Error(error)
    err.httpStatusCode = 500
    next(err)
  }
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
  Swal.fire({
    icon: 'error',
    title: 'Ошибка',
    text: 'Введите корректный email',
    confirmButtonText: 'Закрыть'
  });
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

const ITEMS_PER_PAGE = 1
exports.getLibrary = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1
    const offset = (page - 1) * ITEMS_PER_PAGE
    const { count, rows: guides } = await Guide.findAndCountAll({
      offset: offset,
      limit: ITEMS_PER_PAGE
    })

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE)

    const userPayments = await Payment.findAll({
      where: {
        userId: req.user?.id || null,
        status: 'succeeded'
      },
      attributes: [
        'guideId'
      ]
    })

    const userAvailableGuidesIds = userPayments.map(payment => payment.guideId)


    res.render("blog/library", {
      pageTitle: "Полезные шпаргалки и чек-листы",
      path: "/library",
      csrfToken: req.csrfToken(),
      guides: guides,
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < count,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: totalPages,
      totalPages: totalPages,
      formatFileSize: formatFileSize,
      formatContentType: formatContentType,
      userAvailableGuidesIds: userAvailableGuidesIds || []
    });
  } catch (error) {
    console.log("Ошибка рендеринга страницы:", error);
  }
};


// Проверка перед скачиванием
exports.checkBeforeDownload = (req, res) => {
  const guideId = req.params.guideId;
  // Пример: проверка по сессии или cookie
  const isSubscribed = req.user?.isSubscribed || false;
  res.json({ subscribed: isSubscribed, guideId });
};

// Подписка
exports.subscribe = async (req, res, next) => {
  try {
    const email = req.body.email;
    const userId = req.user.id
    // Здесь сохраните email в базу, файл, Redis и т.д.

    await User.update({ isSubscribed: true }, { where: { id: userId } })
    console.log('Успешно Подписан:', email);

    // Синхронизируем req.user после обновления
    req.user.isSubscribed = true

    res.json({ success: true });
  } catch (err) {
    console.log(err)
    const error = new Error(err)
    error.httpStatusCode = 500
    return next(error)
  }

};

exports.getSubscribe = async (req, res, next) => {
  try {
    return res.render('blog/subscribe', {
      pageTitle: "Оформление подписки",
      path: "/subscribe-page",
      csrfToken: req.csrfToken(),
    })
  } catch (error) {
    console.log(error)
  }
}
exports.getRenderGuide = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect('/singin')
    }
    const guideId = req.params.guideId
    const guideName = `Morning-Routine-Checklist-${guideId}.pdf`
    const guidePath = path.join(__dirname, '..', 'data', 'guides', guideName)
    const fontPath = path.join(__dirname, '..', 'fonts', 'Roboto-Regular.ttf');

    const doc = new PDFDocument({
      size: 'A4',           // или [595.28, 841.89] — размер A4
      margins: { top: 50, bottom: 50, left: 70, right: 70 }
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${guideName}"`);
    // doc.pipe(fs.createWriteStream(guidePath));
    doc.pipe(res)
    doc.
      registerFont('Roboto-Regular', fontPath)
      .font('Roboto-Regular')
      .fontSize(24).text('Вторая страница с тем же фоном', 100, 150, {
        underline: true
      });
    // Путь к фоновому изображению
    // const imagePath = path.join(__dirname, '../images', 'health-and-sports.png'); // поддерживает PNG, JPG
    // if (!fs.existsSync(imagePath)) {
    //   throw new Error(`Фоновое изображение не найдено: ${imagePath}`);
    // }
    // const fontPath = path.join(__dirname, '..', 'fonts', 'Roboto-Regular.ttf');
    // if (!fs.existsSync(fontPath)) {
    //   throw new Error(`Шрифт не найден: ${fontPath}`);
    // }
    // // Размеры страницы
    // const pageWidth = doc.page.width;
    // const pageHeight = doc.page.height;

    // // 1. Добавляем фоновое изображение (на всю страницу)
    // doc.image(imagePath, 0, 0, {
    //   width: pageWidth,
    //   height: pageHeight,
    //   align: 'center',
    //   valign: 'center',
    //   opacity: 1.0 // можно уменьшить, если фон должен быть полупрозрачным
    // });

    // // 2. Устанавливаем слой текста ПОВЕРХ фона
    // doc
    //   .fillColor('#ffffff')
    //   .registerFont('Roboto-Regular', fontPath)
    //   .font('Roboto-Regular')
    //   .fontSize(32)
    //   .text('Добро пожаловать!', 100, 150, {
    //     width: pageWidth - 200,
    //     align: 'center'
    //   });

    // // Если нужно несколько страниц — добавьте
    // doc.addPage();

    // doc.image(imagePath, 0, 0, {
    //   width: pageWidth,
    //   height: pageHeight
    // });

    // doc.fontSize(24).text('Вторая страница с тем же фоном', 100, 150);
    doc.end();
    // const file = fs.createReadStream(guidePath);
    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader('Content-Disposition', `attachment; filename="${guideName}"`);
    // file.pipe(res)
    // ДОБАВЬ: обработчик ошибок, чтобы не уйти в "висящий" запрос
    doc.on('error', (err) => {
      console.error('Ошибка генерации PDF:', err);
      res.status(500).send('Ошибка генерации PDF');
    });

    // Также можно обработать ошибки потока res
    res.on('error', (err) => {
      console.error('Ошибка отправки PDF:', err);
    });

  }
  catch (err) {
    next(err); // Передаём ошибку в обработчик
  }

}

exports.getGuide = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect('/singin')
    }
    const fileId = req.params.guideId
    const downloadedFile = await Guide.findByPk(fileId)
    if (!downloadedFile) throw new Error("Не удалось найти файл")

    const fileUrl = downloadedFile.fileUrl

    res.json({
      downloadUrl: fileUrl
    })

  }
  catch (err) {
    next(err); // Передаём ошибку в обработчик
  }

}