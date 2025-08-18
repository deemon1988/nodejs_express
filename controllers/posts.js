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
  getLatestPostPerCategory,
  getMostPopularPosts,
  getRandomPostInCategory,
  getPopularPostInCategory,
  getPopularPostsLastMonth,
  getTopPostsByCataegoryQuery,
  getTopPostPerCategory
} = require("../services/postService");
const { getRandomPosts } = require("../util/shuffle");
const Alias = require("../models/allowed-alias");
const { viewHistory } = require("../util/viewHistory");
// const { getRecommendedPosts } = require("../util/recomendedPosts");
const { getAllPostsOnPage } = require("../util/allPostsPerPage");
const { getMergedPosts } = require("../util/mergedPosts");
const { getAllCategoriesWithPosts } = require("../services/categoryService");

const Guide = require("../models/guide");
const { formatFileSize, formatContentType } = require("../util/fileFeatures");

const { postsPagination, withLikePostsPagination } = require("../public/assets/js/pagination/main-page-pagination");
const Payment = require("../models/payment");
const Subscription = require("../models/subscription");
const { getRecomendedPosts } = require("../util/post-utils/recomendedPosts");
const { Op } = require("sequelize");

exports.getIndexPage = async (req, res, next) => {
  try {
    let page = +req.query.page || 1;
    const limit = 5;

    const viewHistory = req.session.viewHistory || null;

    const userId = req.user ? req.user.id : null;
    const allPosts = await Post.findAll()


    let mergedPosts
    const allPostsData = await getAllPostsOnPage(userId, page, limit);
    if (viewHistory) {
      mergedPosts = await getMergedPosts(userId, viewHistory, page, limit);
    }

    const recomendedPosts = viewHistory ? await getRecomendedPosts(viewHistory, 5) : getRandomPosts(allPosts, 5)
    // const { rows: postsWithUserLike } = await getPostsWithLikedUsersQuery(userId)
    // const { posts, currentPage, hasNextPage, hasPreviousPage, nextPage, previousPage, lastPage, totalPages } = await withLikePostsPagination(page, userId)
    // const topTop5PostsFromEachCategory = await getRandomPostsFromTop5Query()

    const topPostInEachCategory = await getTopPostsByCataegoryQuery();
    const latestPostsByCategory = await getLatestPostPerCategory()

    res.render("blog/blog", {
      pageTitle: "Главная страница",
      topPosts: getRandomPosts(topPostInEachCategory, 5),
      allPosts: viewHistory ? mergedPosts.posts : allPostsData.posts,
      recomendedPosts: recomendedPosts,
      latestPostsByCategory: latestPostsByCategory,
      successMessage: req.flash("success")[0],
      path: "/",
      csrfToken: req.csrfToken(),
      currentPage: viewHistory ? mergedPosts.currentPage : allPostsData.currentPage,
      hasNextPage: viewHistory ? mergedPosts.hasNextPage : allPostsData.hasNextPage,
      hasPreviousPage: viewHistory ? mergedPosts.hasPreviousPage : allPostsData.hasPreviousPage,
      nextPage: viewHistory ? mergedPosts.nextPage : allPostsData.nextPage,
      previousPage: viewHistory ? mergedPosts.previousPage : allPostsData.previousPage,
      lastPage: viewHistory ? mergedPosts.lastPage : allPostsData.lastPage,
      totalPages: viewHistory ? mergedPosts.totalPages : allPostsData.totalPages
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
  try {
    let page = +req.query.page || 1;
    const userId = req.user ? req.user.id : null;

    const { posts, currentPage, hasNextPage, hasPreviousPage, nextPage, previousPage, lastPage, totalPages } = await withLikePostsPagination(page, userId)
    const mostPopularPosts = await getMostPopularPosts(5)

    const randomPosts = getRandomPosts(posts, 5);

    res.render("blog/posts-list", {
      pageTitle: "Посты",
      posts: posts,
      mostPopularPosts: mostPopularPosts,
      randomPosts: randomPosts,
      path: "/posts",
      csrfToken: req.csrfToken(),
      currentPage: currentPage,
      hasNextPage: hasNextPage,
      hasPreviousPage: hasPreviousPage,
      nextPage: nextPage,
      previousPage: previousPage,
      lastPage: lastPage,
      totalPages: totalPages
    });
  } catch (error) {
    console.error("Ошибка отображения страницы постов: ", error.message)
    const err = new Error(error)
    err.httpStatusCode = 500
    next(500)
  }

  // let recomendetData = await getRecommendedPosts(viewHistory, page, limit);

  // getPostsWithLikedUsersQuery(userId)
  //   .then(({ rows: posts }) => {
  //     allPosts = posts.map((p) => p.toJSON());
  //     allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  //     randomPosts = getRandomPosts(allPosts, 6);
  //     if (viewHistory) {
  //       recomendetPosts = posts.filter(
  //         (post) => !viewHistory.includes(post.id)
  //       );
  //       recomendetPosts = getRandomPosts(recomendetPosts, 5);
  //     }
  //     return getTopCreatedAtPosts();
  //   })
  //   .then((posts) => {
  //     topCreatedAtPosts = posts;
  //     return Category.findAll();
  //   })

  // .then((categories) => {

  // })

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

exports.getCategory = async (req, res, next) => {
  try {
    const page = req.query.page || 1
    const userId = req.user ? req.user.id : null;
    const categoryId = +req.query.category;
    const categoryAlias = await Alias.findOne({ where: { categoryId: categoryId } })
    const category = await Category.findByPk(categoryId);
    const { posts, currentPage, hasNextPage, hasPreviousPage, nextPage, previousPage, lastPage, totalPages } = await withLikePostsPagination(page, userId, categoryId)
    const randomPostsInCategory = await getRandomPostInCategory(categoryId, 5)
    const popularPostsInCategory = await getPopularPostInCategory(categoryId, 5)
    const categories = await Category.findAll();

    res.render(`blog/category/${categoryAlias.name}`, {
      posts: posts,
      category: category,
      pageTitle: category.name,
      popularPosts: popularPostsInCategory,
      randomPosts: randomPostsInCategory,
      categories: categories,
      path: "/categories",
      csrfToken: req.csrfToken(),
      currentPage: currentPage,
      hasNextPage: hasNextPage,
      hasPreviousPage: hasPreviousPage,
      nextPage: nextPage,
      previousPage: previousPage,
      lastPage: lastPage,
      totalPages: totalPages
    });
  } catch (error) {
    console.error(error.message)
    const err = new Error(error)
    err.httpStatusCode = 500
    next(err)
  }


};

exports.getCategories = async (req, res, next) => {
  try {
    const page = req.query.page || 1
    const userId = req.user ? req.user.id : null;

    const { posts, currentPage, hasNextPage, hasPreviousPage, nextPage, previousPage, lastPage, totalPages } = await withLikePostsPagination(page, userId) // getPostsWithLikedUsersQuery(userId)
    const categoriesWithPosts = await getAllCategoriesWithPosts()
    const topPostsByCataegory = await getTopPostsByCataegoryQuery()
    console.log(topPostsByCataegory)
    res.render("blog/categories", {
      pageTitle: "Категории",
      path: "/categories",
      posts: posts,
      randomPosts: getRandomPosts(topPostsByCataegory, 5),
      categories: categoriesWithPosts,
      formatDate: formatDateOnly,
      csrfToken: req.csrfToken(),
      posts: posts,
      currentPage: currentPage,
      hasNextPage: hasNextPage,
      hasPreviousPage: hasPreviousPage,
      nextPage: nextPage,
      previousPage: previousPage,
      lastPage: lastPage,
      totalPages: totalPages
    });

  } catch (error) {
    console.error("Ошибка получения страницы с категориями: ", error.message)
    const err = new Error(error)
    err.httpStatusCode = 500
    next(err)
  }
};

exports.getArchive = async (req, res, next) => {
  try {
    const userId = req.user?.id || null
    const page = req.query.page || 1
    const year = req.query.year ? +req.query.year : null;

    const { posts, currentPage, hasNextPage, hasPreviousPage, nextPage, previousPage, lastPage, totalPages } = await withLikePostsPagination(page, userId, null, {year: year})
    const popularPostsLastMonth = await getPopularPostsLastMonth(3);
    const popularPostsInCategoryByDate = await getTopPostPerCategory(year)

      res.render("blog/archive", {
        pageTitle: "Архив",
        path: "/archive",
        csrfToken: req.csrfToken(),
        posts: posts,
        lastMonthPosts: popularPostsLastMonth,
        postsInCategoryByDate: popularPostsInCategoryByDate,
        year: year,
        currentPage: currentPage,
        hasNextPage: hasNextPage,
        hasPreviousPage: hasPreviousPage,
        nextPage: nextPage,
        previousPage: previousPage,
        lastPage: lastPage,
        totalPages: totalPages
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
      userAvailableGuidesIds: userAvailableGuidesIds || [],
      successMessage: req.flash('success')[0] || null
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
    // const email = req.body.email;
    const email = req.user.email
    const userId = req.user.id
    // Здесь сохраните email в базу, файл, Redis и т.д.
    await Subscription.create({ isActive: true, userId: userId })
    await User.update({ isSubscribed: true }, { where: { id: userId } })
    console.log('Успешно Подписан:', email);

    // Синхронизируем req.user после обновления
    req.user.isSubscribed = true

    res.json({ success: true });
  } catch (err) {
    console.log(err)
    res.json({ success: false });
    // const error = new Error(err)
    // error.httpStatusCode = 500
    // return next(error)
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

exports.getSearch = async (req, res, next) => {
  try {
    const query = req.query.query || '';
    const categoryId = req.query.category || '';
    const type = req.query.type || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    let searchResults = [];
    let totalResults = 0;
    let categories = [];

    categories = await Category.findAll({
      order: [['name', 'ASC']]
    });

    if (query.trim()) {
      const { Op } = require('sequelize');

      if (type === 'posts') {
        // Только посты
        let postSearchConditions = {};
        let postIncludeOptions = [{
          model: Category,
          as: 'category',
          attributes: ['name']
        }];

        postSearchConditions[Op.or] = [
          { title: { [Op.iLike]: `%${query}%` } },
          { content: { [Op.iLike]: `%${query}%` } },
          { preview: { [Op.iLike]: `%${query}%` } },
          { '$category.name$': { [Op.iLike]: `%${query}%` } }
        ];

        if (categoryId) {
          postSearchConditions['$category.id$'] = categoryId;
        }

        const postResult = await Post.findAndCountAll({
          where: postSearchConditions,
          include: postIncludeOptions,
          order: [['createdAt', 'DESC']],
          limit: limit,
          offset: offset
        });

        searchResults = postResult.rows.map(post => ({
          ...post.toJSON(),
          searchType: 'post'
        }));
        totalResults = postResult.count;

      } else if (type === 'guides') {
        // Только гайды
        let guideSearchConditions = {};
        let guideIncludeOptions = [];

        guideSearchConditions[Op.or] = [
          { title: { [Op.iLike]: `%${query}%` } },
          { content: { [Op.iLike]: `%${query}%` } },
          { preview: { [Op.iLike]: `%${query}%` } }
        ];

        if (categoryId) {
          guideIncludeOptions.push({
            model: Category,
            as: 'categories',
            where: {
              id: categoryId
            },
            attributes: []
          });
        } else {
          guideIncludeOptions.push({
            model: Category,
            as: 'categories',
            attributes: ['name'],
            through: { attributes: [] }
          });
        }

        const guideResult = await Guide.findAndCountAll({
          where: guideSearchConditions,
          include: guideIncludeOptions,
          order: [['id', 'DESC']],
          limit: limit,
          offset: offset
        });

        searchResults = guideResult.rows.map(guide => ({
          ...guide.toJSON(),
          searchType: 'guide'
        }));
        totalResults = guideResult.count;

      } else {
        // Все типы - получаем все результаты и делаем пагинацию в памяти
        // Это подход может быть неэффективным для больших наборов данных

        // Получаем все посты (без лимита для правильного подсчета)
        let postSearchConditions = {};
        let postIncludeOptions = [{
          model: Category,
          as: 'category',
          attributes: ['name']
        }];

        postSearchConditions[Op.or] = [
          { title: { [Op.iLike]: `%${query}%` } },
          { content: { [Op.iLike]: `%${query}%` } },
          { preview: { [Op.iLike]: `%${query}%` } },
          { '$category.name$': { [Op.iLike]: `%${query}%` } }
        ];

        if (categoryId) {
          postSearchConditions['$category.id$'] = categoryId;
        }

        const postResult = await Post.findAndCountAll({
          where: postSearchConditions,
          include: postIncludeOptions,
          order: [['createdAt', 'DESC']]
        });

        // Получаем все гайды
        let guideSearchConditions = {};
        let guideIncludeOptions = [];

        guideSearchConditions[Op.or] = [
          { title: { [Op.iLike]: `%${query}%` } },
          { content: { [Op.iLike]: `%${query}%` } },
          { preview: { [Op.iLike]: `%${query}%` } }
        ];

        if (categoryId) {
          guideIncludeOptions.push({
            model: Category,
            as: 'categories',
            where: {
              id: categoryId
            },
            attributes: []
          });
        } else {
          guideIncludeOptions.push({
            model: Category,
            as: 'categories',
            attributes: ['name'],
            through: { attributes: [] }
          });
        }

        const guideResult = await Guide.findAndCountAll({
          where: guideSearchConditions,
          include: guideIncludeOptions,
          order: [['id', 'DESC']]
        });

        // Объединяем все результаты
        const allPostResults = postResult.rows.map(post => ({
          ...post.toJSON(),
          searchType: 'post',
          sortValue: post.createdAt.getTime()
        }));

        const allGuideResults = guideResult.rows.map(guide => ({
          ...guide.toJSON(),
          searchType: 'guide',
          sortValue: guide.createdAt.getTime() //guide.id // используем id как приближение
        }));

        const allResults = [...allPostResults, ...allGuideResults].sort((a, b) => b.sortValue - a.sortValue);

        totalResults = allResults.length;

        // Применяем пагинацию
        searchResults = allResults.slice(offset, offset + limit);
      }
    }

    const totalPages = Math.ceil(totalResults / limit);

    res.render('search/search-results', {
      pageTitle: 'Результаты поиска' + (query ? ' для "' + query + '"' : ''),
      path: '/search',
      csrfToken: req.csrfToken(),
      query: query,
      categoryId: categoryId,
      type: type,
      results: searchResults,
      categories: categories,
      currentPage: page,
      totalPages: totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: totalPages,
      totalResults: totalResults,
      hasResults: searchResults.length > 0
    });

  } catch (error) {
    console.error('Ошибка поиска:', error);
    next(error);
  }
};


// exports.getSearch = async (req, res, next) => {
//   try {
//     const query = req.query.query || '';
//     const categoryId = req.query.category || '';
//     const page = parseInt(req.query.page) || 1;
//     const limit = 10;
//     const offset = (page - 1) * limit;

//     let searchResults = [];
//     let totalResults = 0;
//     let categories = [];

//     // Получаем все категории для фильтра
//     categories = await Category.findAll({
//       order: [['name', 'ASC']]
//     });

//     let searchConditions = {};
//     let includeOptions = [{
//       model: Category,
//       as: 'category',
//       attributes: ['name']
//     }];

//     if (query.trim()) {
//       const { Op } = require('sequelize');

//       // Базовый поиск
//       searchConditions[Op.or] = [
//         { title: { [Op.iLike]: `%${query}%` } },
//         { content: { [Op.iLike]: `%${query}%` } },
//         { preview: { [Op.iLike]: `%${query}%` } },
//         { '$category.name$': { [Op.iLike]: `%${query}%` } }
//       ];
//     }

//     // Фильтр по категории
//     if (categoryId) {
//       searchConditions.categoryId = categoryId;
//     }

//     // Получаем результаты с пагинацией и включаем категорию
//     const result = await Post.findAndCountAll({
//       where: searchConditions,
//       include: includeOptions,
//       order: [['createdAt', 'DESC']],
//       limit: limit,
//       offset: offset
//     });

//     searchResults = result.rows;
//     totalResults = result.count;

//     const totalPages = Math.ceil(totalResults / limit);

//     res.render('search/search-results', {
//       pageTitle: 'Результаты поиска' + (query ? ' для "' + query + '"' : ''),
//       path: '/search',
//       csrfToken: req.csrfToken(),
//       query: query,
//       categoryId: categoryId,
//       results: searchResults,
//       categories: categories,
//       currentPage: page,
//       totalPages: totalPages,
//       hasPreviousPage: page > 1,
//       hasNextPage: limit * page < totalResults,
//       nextPage: page + 1,
//       previousPage: page - 1,
//       lastPage: totalPages,
//       totalResults: totalResults,
//       hasResults: searchResults.length > 0
//     });

//   } catch (error) {
//     console.error('Ошибка поиска:', error);
//     next(error);
//   }
// };

