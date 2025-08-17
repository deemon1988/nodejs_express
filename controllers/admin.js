const Alias = require("../models/allowed-alias");
const Category = require("../models/category");
const Post = require("../models/post");
const Profile = require("../models/profile");
const User = require("../models/user");
const UserActivity = require("../models/user-activity");
const { cleanInput } = require("../util/sanitazeHtml");
const path = require("path");
const sanitizeHtml = require("sanitize-html");
const createHtmlTemplate = require("../util/createHtml");
const { validationResult } = require("express-validator");
const { deleteFile, deleteFiles } = require("../util/fileUtils");
const Image = require("../models/image");
const { getContentImages } = require("../util/contentImages");
const { Op } = require("sequelize");
const axios = require('axios')
const qs = require('querystring');
const fs = require('fs');
const Guide = require("../models/guide");
const { getFileType } = require("../util/fileFeatures");
const { createUserActivity } = require("../util/userActivity");
const { getFileFromRequest, checkAndSaveFileFromRequest, getFilesFromRequest } = require("../util/handleFileFromRequest");
const { updateTinyMceImages, deleteUnusedTinyMceImages } = require("../util/post-utils/unusedTinyMceImages");
const { clearSessionImages } = require("../util/post-utils/clearSessionTemp");
const { deleteOldCover, deleteOldImage } = require("../util/post-utils/deleteOldImages");
const { checkImageFormat } = require("../util/post-utils/checkUploadedImage");
const { postsPagination } = require("../public/assets/js/pagination/main-page-pagination");
const { getYandexDiskToken } = require("../public/assets/js/yandexApi/helpers");

exports.postAddImage = async (req, res) => {
  try {
    const file = req.file;
    if (!req.file) {
      return res.status(400).json({ error: "Файл не загружен" });
    }

    // Сохраняем метаданные в БД
    const image = new Image({
      filename: file.filename,
      path: `${req.protocol}://${req.get('host')}/images/posts/tinymce/${file.filename}`, // или req.path динамически
      size: file.size,
      mimetype: file.mimetype,
      // entityType: 'post'
      // postId пока null — неизвестен
    });
    await image.save()
    // Возвращаем URL для TinyMCE
    res.json({
      location: image.path
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
};

exports.getAddPost = (req, res, next) => {
  Category.findAll().then((categories) => {
    res.render("admin/edit-post", {
      pageTitle: "Создать пост",
      path: "/admin/create-post",
      editing: false,
      categories: categories,
      csrfToken: req.csrfToken(),
      hasError: false,
      errorMessage: req.flash("error")[0] || null,
      successMessage: req.flash("success")[0] || null,
      validationErrors: [],
    });
  });
};

exports.postAddPost = async (req, res, next) => {
  try {
    const title = req.body.title.trim();
    const content = req.body.content;
    const preview = req.body.preview;
    const categoryId = req.body.category;
    const user = req.user;

    const cleanTitle = sanitizeHtml(title, {
      allowedTags: [],
      allowedAttributes: {},
    });
    const cleanContent = cleanInput(content);
    const cleanPreview = cleanInput(preview);

    const category = await Category.findByPk(Number(categoryId));

    let image;
    let cover;
    let gallery;

    // Для постов
    image = getFileFromRequest(req, 'image', '/images/posts');
    cover = getFileFromRequest(req, 'cover', '/images/posts/cover');

    // Галерея
    gallery = getFilesFromRequest(req, 'gallery', '/images/posts/gallery')


    // Проверяем есть ли ошибки валидации
    const errors = validationResult(req).array();

    checkImageFormat(req, errors)

    // Если есть ошибки валидации
    if (errors.length > 0) {
      const categories = await Category.findAll();

      // Удаляем изображения сохраненные в Temp или обновляем временное изображение и удаляем ранее сохраненное
      checkAndSaveFileFromRequest(req, '/images/posts')

      return res.status(422).render("admin/edit-post", {
        post: {
          title: cleanTitle,
          content: cleanContent,
          preview: cleanPreview,
          categoryId: category ? category.id : null,
          image: image,
          cover: cover,
          gallery: gallery,
          likes: 0,
        },
        pageTitle: "Создать пост",
        path: "/admin/create-post",
        editing: false,
        categories: categories,
        csrfToken: req.csrfToken(),
        hasError: true,
        errorMessage: errors[0].msg,
        validationErrors: errors,
        successMessage: null,
      });
    }

    const userProfile = await Profile.findOne({ where: { userId: user.id } });
    if (!userProfile) {
      throw new Error("Профиль пользователя не найден");
    }

    const createdPost = await user.createPost({
      title: cleanTitle,
      content: cleanContent,
      preview: cleanPreview,
      image: image,
      cover: cover,
      gallery: gallery,
      likes: 0,
      categoryId: category.id,
    });

    // Удаляем изображения сохраненные в Temp или обновляем временное изображение и удаляем ранее сохраненное
    checkAndSaveFileFromRequest(req, '/images/posts')

    // Обновляем entityId и entityType для использованных изображений
    const usedImages = getContentImages(cleanContent)
    await updateTinyMceImages(createdPost.id, 'post', usedImages)

    // Удаляем неиспользованные изображения из БД
    const oldTinymceImages = await Image.findAll({ where: { entityId: null, entityType: null } })
    await deleteUnusedTinyMceImages(oldTinymceImages, usedImages)

    await createUserActivity(user.id, "post_created", "post", createdPost.id, `Добавлен пост "${createdPost.title}"`)

    clearSessionImages(req)

    req.flash("success", "Пост успешно добавлен!");
    return res.redirect("/admin/posts");

  } catch (err) {
    console.error("Ошибка при добавлении поста:", err);
    clearSessionImages(req)
    const error = new Error(err)
    error.httpStatusCode = 500
    return next(error)
  }
};

exports.postCancelPostCreate = (req, res, next) => {
  if (req.session.tempGallery) {
    deleteFiles(req.session.tempGallery)
  }
  if (req.session.tempImage) deleteFile(req.session.tempImage)
  if (req.session.tempCover) deleteFile(req.session.tempCover)
  clearSessionImages(req)
  res.redirect('/admin/posts')
}

exports.deletePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const deleteablePost = await Post.findOne({ where: { id: postId, userId: req.user.id } })
    if (!deleteablePost) {
      req.flash("error", "У вас не прав для удаления поста");
      throw new Error("Пост не найден");
    }
    const tinymce_images = await Image.findAll({ where: { entityId: deleteablePost.id, entityType: 'post' } })
    if (tinymce_images.length > 0) {
      const imagesPaths = tinymce_images.map(image => image.path)
      deleteFiles(imagesPaths)
    }
    if (deleteablePost.image) deleteFile(deleteablePost.image)
    if (deleteablePost.cover) deleteFile(deleteablePost.cover)
    if (deleteablePost.gallery) deleteFiles(deleteablePost.gallery)

    await Image.deleteByEntity(deleteablePost.id, 'post')
    await deleteablePost.destroy()

    req.flash("success", "Пост был удален");
    res.status(200).json({
      success: true,
      message: "Пост был удален"
    })
    // res.redirect("/admin/posts");
  } catch (err) {
    console.log(err);
    req.flash("error", `Не получилось удалить пост: ${err.message}`);
    res.status(500).json({
      success: false,
      message: `Не получилось удалить пост: ${err.message}`
    })
    // res.redirect("/admin/posts");
  }
};

exports.getAllPosts = async (req, res, next) => {
  try {
    const page = req.query.page
    const { posts, currentPage, hasNextPage, hasPreviousPage, nextPage, previousPage, lastPage, totalPages } = await postsPagination(page)

    res.render("admin/posts", {
      pageTitle: "Админ посты",
      path: "/admin/posts",
      csrfToken: req.csrfToken(),
      errorMessage: req.flash("error")[0] || null,
      successMessage: req.flash("success")[0] || null,
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
    console.error(error.message)
    const err = new Error(error)
    err.httpStatusCode = 500
    next(err)
  }
};

exports.getEditPost = (req, res, next) => {
  const editMode = req.query.edit;
  let existPost;

  if (!editMode) {
    return res.redirect("/admin/posts");
  }
  const postId = req.params.postId;

  Post.findOne({ where: { id: postId, userId: req.user.id } })
    .then((post) => {
      if (!post) {
        req.flash("error", "Вы не можете редактировать этот пост");
        throw new Error("Пост не найден");
      }
      existPost = post;
      return Category.findAll();
    })
    .then((categories) => {
      res.render("admin/edit-post", {
        pageTitle: "Редактировать пост",
        path: "/admin/edit-post",
        editing: editMode,
        post: existPost,
        categories: categories,
        csrfToken: req.csrfToken(),
        errorMessage: null,
        successMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => {
      console.log("Ошибка:", err.message);
      res.redirect("/admin/posts");
    });
};

exports.postEditPost = async (req, res, next) => {
  try {
    const postId = req.body.postId;
    const updatedTitle = req.body.title.trim();
    const updatedContent = req.body.content;
    const updatedPreview = req.body.preview;
    const categoryId = Number(req.body.category);

    const updatedPost = await Post.findByPk(postId);
    if (!updatedPost || updatedPost.userId !== req.user.id) {
      return res.redirect("/admin/posts");
    }

    let oldImage = updatedPost.image;
    let oldCover = updatedPost.cover;
    let oldGallery = updatedPost.gallery;

    const oldTinymceImages = await Image.findAll({
      where: {
        [Op.or]: [
          { entityId: postId, entityType: 'post' },
          { entityId: null, entityType: null },
        ]
      }
    })

    let image = getFileFromRequest(req, 'image', '/images/posts')
    let cover = getFileFromRequest(req, 'cover', '/images/posts/cover')
    let gallery = getFilesFromRequest(req, 'gallery', '/images/posts/gallery')

    const imageDeleted = req.body.imageDeleted === 'true';
    if (!image && imageDeleted) {
      deleteFile(oldImage)
      oldImage = null
    }
    const coverDeleted = req.body.coverDeleted === 'true';
    if (!cover && coverDeleted) {
      deleteFile(oldCover)
      oldCover = null
    }

    const galleryDeleted = req.body.galleryDeleted === 'true';

    if (!gallery && galleryDeleted) {
      deleteFiles(oldGallery)
      oldGallery = null
    }

    const errors = validationResult(req).array();

    checkImageFormat(req, errors)

    if (errors.length > 0) {
      checkAndSaveFileFromRequest(req, '/images/posts')

      const categories = await Category.findAll();
      return res.status(422).render("admin/edit-post", {
        pageTitle: "Редактировать пост",
        path: "/admin/edit-post",
        editing: true,
        hasError: true,
        post: {
          id: postId,
          title: updatedTitle,
          content: updatedContent,
          preview: updatedPreview,
          image: req.session.tempImage || oldImage,
          cover: req.session.tempCover || oldCover,
          gallery: req.session.tempGallery || oldGallery,
          categoryId: categoryId,
        },
        categories: categories,
        csrfToken: req.csrfToken(),
        errorMessage: errors[0].msg,
        validationErrors: errors,
        successMessage: null,
      });
    }


    updatedPost.title = updatedTitle;
    updatedPost.content = updatedContent;
    updatedPost.preview = updatedPreview;
    updatedPost.categoryId = categoryId;
    updatedPost.image = image || oldImage;
    updatedPost.cover = cover || oldCover;
    updatedPost.gallery = gallery || oldGallery;

    await updatedPost.save();


    // Удаляем изображения сохраненные в Temp или обновляем временное изображение и удаляем ранее сохраненное
    checkAndSaveFileFromRequest(req, '/images/posts')

    deleteOldImage(oldImage, updatedPost.image)
    deleteOldCover(oldCover, updatedPost.cover)
    // deleteOldGallery(oldGallery, updatedPost.gallery)

    // Обновляем entityId и entityType для использованных изображений
    const usedImages = getContentImages(updatedContent)
    if (usedImages && usedImages.length > 0) {
      await updateTinyMceImages(updatedPost.id, usedImages)
    }

    // Удаляем неиспользованные изображения из БД
    await deleteUnusedTinyMceImages(oldTinymceImages, usedImages)

    clearSessionImages(req)

    req.flash("success", "Пост успешно обновлен!");

    res.redirect("/admin/posts");
  } catch (err) {
    console.error("Ошибка при обновлении поста:", err);
    clearSessionImages(req)
    const error = new Error(err)
    error.httpStatusCode = 500
    next(error)
  }
};

exports.postCreateAlias = (req, res, next) => {
  const name = req.body.alias.trim().toUpperCase();

  Alias.findOne({ where: { name: name } })
    .then((result) => {
      if (result) {
        throw new Error("Alias all ready exist");
      }
      return Alias.create({ name: name, userId: req.user.id });
    })
    .then(async (alias) => {
      // Создавать страницу с именем алиаса
      const filePath = path.resolve(
        __dirname,
        `../views/blog/category/${alias.name}.ejs`
      );
      const templatePath = path.resolve(
        __dirname,
        "../views/blog/category/template.ejs"
      );
      return await createHtmlTemplate(
        filePath,
        `${alias.name}.ejs`,
        templatePath
      );
    })
    .then((file) => {
      if (!file) {
        throw new Error("не удалось создать шаблон");
      }
      res.redirect("/admin/create-category");
    })
    .catch((err) => {
      console.log(err.message);
      res.redirect("/admin/create-category");
    });
};

exports.postEditAlias = (req, res, next) => {
  const aliasId = req.body.aliasId;
  const updatedName = req.body.updatedName;
  const actionType = req.body.action;

  Alias.findByPk(aliasId)
    .then((alias) => {
      if (actionType === "delete") {
        const templatePath = path.join(__dirname, '..', 'views/blog/category/', `${alias.name}.ejs`)
        if (!fs.existsSync(templatePath)) {
          console.log(`Файл-шаблон не найден: ${templatePath}`)
          throw new Error(`Файл-шаблон не найден: ${templatePath}`);
        }
        fs.unlink(templatePath, (err) => {
          if (err) throw new Error(err);
          console.log(`${templatePath} was deleted`);
        })
        return alias.destroy();
      }
      alias.name = updatedName;
      return alias.save();
    })
    .then((result) => res.redirect("/admin/create-category"))
    .catch((err) => {
      console.error(err)
      req.flash('error', err.message)
      res.redirect("/admin/create-category")
    })
};

exports.postDeleteCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.categoryId;

    const category = await Category.findByPk(categoryId)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Категория не найдена или у Вас нет прав для удаления"
      })
    }

    deleteFile(category.image)

    await category.destroy();

    return res.status(200).json({
      success: true,
      message: `Категория '${category.name}' была удалена`
    })

  } catch (error) {
    console.error("Ошибка удаления категории: ", error);
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}



exports.getCreateCategory = async (req, res, next) => {
  try {
    const editMode = req.query.edit;
    if (editMode && editMode === 'true') {
      return res.redirect('/admin/posts')
    }
    const existsAliases = await Alias.findAll({
      include: [
        {
          model: Category,
          required: false, // чтобы получить aliases даже без категорий
        },
      ],
    })
    const existCategories = await Category.findAll()

    res.render("admin/create-category", {
      categories: existCategories,
      aliases: existsAliases,
      pageTitle: "Добавить категорию",
      path: "/admin/create-category",
      editing: editMode === 'true' ? true : false,
      csrfToken: req.csrfToken(),
      errorMessage: req.flash("error")[0] || null,
      successMessage: req.flash("success")[0] || null,
    });
  } catch (error) {
    console.error("Ошибка отображения страницы создания категории: ", error);
    const err = new Error(error.message)
    err.httpStatusCode = 500
    return next(err)
  }
};

exports.postCreateCategory = async (req, res, next) => {
  try {
    const aliasId = req.body.aliasId;
    const name = req.body.name.trim();
    const tagline = req.body.tagline.trim();
    const description = req.body.description.trim();
    const logo = req.file ? `/images/category/` + req.file.filename : null;

    const cleanName = sanitizeHtml(name, {
      allowedTags: [],
      allowedAttributes: {},
    });
    const cleanTagline = cleanInput(tagline);

    let cleanDescription;
    if (description) {
      cleanDescription = cleanInput(description);
    }

    const alias = await Alias.findByPk(aliasId)
    if (!alias) {
      throw new Error("Alias не найден");
    }
    if (alias.categoryId) {
      throw new Error(`Категория с алиасом '${alias.name}' уже существует. <br>
          Создайте другую категорию`);
    }

    const existCategory = await Category.findOne({ where: { name: cleanName } });
    if (existCategory) {
      throw new Error(`Категория '${cleanName}' уже существует.<br>
          Введите другое название категории`);
    }
    const createdCategory = await Category.create({
      name: cleanName,
      tagline: cleanTagline,
      description: cleanDescription,
      image: logo,
    });

    await alias.setCategory(createdCategory);

    req.flash('success', `Категория '${cleanName}' успешно добавлена`)
    res.redirect("/admin/create-category");

  } catch (err) {
    console.log("Ошибка создания категории:", err.message);
    req.flash('error', err.message)
    res.redirect("/admin/create-category");
  }
};

exports.getEditCategory = async (req, res, next) => {
  try {
    const editMode = req.query.edit;
    if (!editMode || editMode === 'false') {
      return res.redirect("/admin/create-category");
    }

    const categoryId = req.params.categoryId;

    const updatedCategory = await Category.findOne({
      where: { id: categoryId },
      include: [
        {
          model: Alias,
          as: "alias",
        },
      ],
    })

    if (!updatedCategory) {
      req.flash("error", "Категория для редактирования не найдена");
      throw new Error("Категория не существует");
    }

    res.render("admin/create-category", {
      pageTitle: "Редактировать категорию",
      path: "/admin/create-category",
      editing: editMode,
      category: updatedCategory,
      categoryAlias: updatedCategory.alias.name,
      csrfToken: req.csrfToken(),
      errorMessage: req.flash("error")[0] || null,
      successMessage: req.flash("success")[0] || null,
    });
  } catch (error) {
    console.error("Ошибка отображения страницы редактирования категории: ", error);
    const err = new Error(error)
    err.httpStatusCode = 500
    return next(err)
  }
};

exports.postEditCategory = async (req, res, next) => {
  try {
    const categoryId = req.body.categoryId;
    const updatedName = req.body.name;
    const updatedTagline = req.body.tagline;
    const updatedDescription = req.body.description;
    const imageDeleted = req.body.imageDeleted

    const updatedCategory = await Category.findByPk(categoryId);

    updatedCategory.name = updatedName;
    updatedCategory.tagline = updatedTagline;
    updatedCategory.description = updatedDescription;

    if (req.file) {
      deleteFile(updatedCategory.image)
      updatedCategory.image = "/images/category/" + req.file.filename;
    }

    if (imageDeleted && imageDeleted === 'true') {
      deleteFile(updatedCategory.image)
      updatedCategory.image = null
    }

    await updatedCategory.save();

    req.flash("success", "Категория успешно отредактирована!");
    res.redirect("/admin/create-category");
  } catch (error) {
    console.error("Ошибка обновления категории: ", error)
    const err = new Error(error.message)
    err.httpStatusCode = 500
    return next(err)
  }
}


exports.getAddGuide = async (req, res, next) => {
  try {
    const categories = await Category.findAll()
    res.render('admin/add-guide', {
      pageTitle: "Добавить гайд",
      path: "/admin/add-guide",
      editing: false,
      categories: categories,
      csrfToken: req.csrfToken(),
      errorMessage: req.flash("error")[0] || null,
      successMessage: req.flash("success")[0] || null,
      hasError: false,
      validationErrors: [],
      yandexDiskAccessToken: getYandexDiskToken(req)
    })
  } catch (error) {
    console.log("Ошибка: ", error)
    throw new Error("Ошибка рендеринга страницы")
  }
}

exports.postAddGuide = async (req, res, next) => {
  try {
    const { title, preview, content, fileUrl, fileType, fileSize, accessType, price, category } = req.body;
    const userId = req.user.id
    const guideCategory = await Category.findByPk(Number(category));
    const cleanTitle = sanitizeHtml(title, {
      allowedTags: [],
      allowedAttributes: {},
    });
    const cleanContent = cleanInput(content);
    const cleanPreview = cleanInput(preview);

    let image;
    let cover;

    // Для гайдов
    image = getFileFromRequest(req, 'image', '/images/guides');
    cover = getFileFromRequest(req, 'cover', '/images/guides/cover');

    const errors = validationResult(req).array();
    checkImageFormat(req, errors)
    // Если есть ошибки валидации
    if (errors.length > 0) {
      const categories = await Category.findAll();

      checkAndSaveFileFromRequest(req, '/images/guides')

      return res.status(422).render("admin/add-guide", {
        guide: {
          title: cleanTitle,
          content: cleanContent,
          preview: cleanPreview,
          image: image,
          cover: cover,
          fileUrl: fileUrl,
          fileType: fileType,
          fileSize: fileSize,
          accessType: accessType,
          price: price,
          categoryId: +category,
        },

        pageTitle: "Добавить гайд",
        path: "/admin/add-guide",
        editing: false,
        categories: categories,
        csrfToken: req.csrfToken(),
        hasError: true,
        errorMessage: errors[0].msg,
        validationErrors: errors,
        successMessage: null,
      });
    }

    const createdGuide = await Guide.create({
      title,
      preview,
      content,
      image,
      cover,
      fileUrl,
      fileType,
      fileSize,
      accessType: accessType,
      price: price,
      // categoryId: +category
    });
    await createdGuide.addCategory(guideCategory)
    // Удаляем изображения сохраненные в Temp или обновляем временное изображение и удаляем ранее сохраненное
    checkAndSaveFileFromRequest(req, '/images/posts')

    const usedImages = getContentImages(cleanContent)
    await updateTinyMceImages(createdGuide.id, 'guide', usedImages)

    // Удаляем неиспользованные изображения из БД
    const oldTinymceImages = await Image.findAll({ where: { entityId: null, entityType: null } })
    await deleteUnusedTinyMceImages(oldTinymceImages, usedImages)

    await createUserActivity(userId, "guide_created", "guide", createdGuide.id, `Добавлен материал "${createdGuide.title}"`)

    clearSessionImages(req)

    req.flash('success', 'Гайд успешно добавлен!');
    return res.redirect('/library');

  } catch (err) {
    console.error("Ошибка при добавлении гайда:", err); // ← должно выводиться
    clearSessionImages(req)
    const error = new Error(err.message);
    error.httpStatusCode = 500;
    return next(error); // ← передаём ошибку
  }
};


exports.yandexDiskAuth = (req, res, next) => {
  const clientId = process.env.CLIENT_ID_DISK_API;
  const redirectUri = process.env.REDIRECT_URI_DISK_API; // должен быть настроен в Яндексе
  const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.json({ url: authUrl });
}

exports.handleYandexCallback = async (req, res, next) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Ошибка: не получен code');
  }

  try {
    // Получение access_token
    const tokenResponse = await axios.post('https://oauth.yandex.ru/token',
      qs.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.CLIENT_ID_DISK_API,
        client_secret: process.env.CLIENT_SECRET_DISK_API,
        redirect_uri: process.env.REDIRECT_URI_DISK_API
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in; // обычно 3600 секунд = 1 час
    const expireTime = Date.now() + expiresIn * 1000;

    if (!accessToken || !expireTime) {
      return res.status(401).json({ error: 'Токен не найден' });
    }
    if (Date.now() > expireTime) {
      return res.status(401).json({ error: 'Токен истёк. Авторизуйтесь заново.' });
    }

    req.session.yandexDiskAccessToken = {
      token: accessToken,
      expireTime: expireTime
    }

    req.flash("success", "Успешная авторизация, теперь можно получить ссылку");
    await req.session.save()

    res.redirect('/admin/add-guide')

  } catch (error) {
    console.log("Ошибка: ", error)
    throw new Error("Ошибка получения и сохранения токена")
  }
}


exports.getDownloadLink = async (req, res) => {
  const fileName = req.query.fileName;

  try {
    const yandexDiskAccessToken = getYandexDiskToken(req)
    if (!yandexDiskAccessToken) {
      req.flash("error", "Требуется авторизация Яндекс ID!");
      return res.status(403).json({
        error: 'Требуется авторизация',
        redirect: '/admin/add-guide'
      });
    }

    const path = `guides/${fileName}`;
    // Открываем файл для публичного доступа
    await axios.put(`https://cloud-api.yandex.net/v1/disk/resources/publish`, null, {
      params: { path },
      headers: { Authorization: `${yandexDiskAccessToken.token}` }
    })

    // Получаем метаданные
    const response = await axios.get(`https://cloud-api.yandex.net/v1/disk/resources`, {
      params: { path },
      headers: { Authorization: `${yandexDiskAccessToken.token}` }
    });

    const publickey = response.data.public_key
    if (!publickey) {
      return res.status(404).json({ error: 'Файл закрыт для публичного доступа' })
    }

    const result = await axios.get(`https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(publickey)}`)

    const publicUrl = result.data.href;
    const fileSize = response.data.size;
    const mimeType = response.data.mime_type

    if (!publicUrl) {
      return res.status(404).json({ error: 'Ссылка не доступна' });
    }

    res.json({
      downloadLink: publicUrl,
      fileSize: fileSize,
      fileType: getFileType(mimeType)
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Ошибка получения ссылки' });
  }
};

exports.getDownloadPdf = async (req, res, next) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Ошибка: не получен code');
  }

  try {
    // Получение access_token
    const tokenResponse = await axios.post('https://oauth.yandex.ru/token',
      qs.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.CLIENT_ID_DISK_API,
        client_secret: process.env.CLIENT_SECRET_DISK_API,
        redirect_uri: process.env.REDIRECT_URI_DISK_API
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in; // обычно 3600 секунд = 1 час
    const expireTime = Date.now() + expiresIn * 1000;

    if (!accessToken || !expireTime) {
      return res.status(401).json({ error: 'Токен не найден' });
    }
    if (Date.now() > expireTime) {
      return res.status(401).json({ error: 'Токен истёк. Авторизуйтесь заново.' });
    }
    // ШАГ 2: Теперь можно загрузить PDF в Яндекс.Диск
    const uploadUrl = 'https://cloud-api.yandex.net/v1/disk/resources/upload';
    const folder = 'guides';
    const fileName = `Checklist-123-${Date.now()}.pdf`;
    const filePath = `${folder}/${fileName}`;

    // Получаем URL для загрузки
    const uploadMeta = await axios.get(uploadUrl, {
      params: {
        path: filePath,
        overwrite: true
      },
      headers: {
        Authorization: `OAuth ${accessToken}`
      }
    });

    const uploadUrlFinal = uploadMeta.data.href;

    // Загружаем файл (предположим, у тебя есть буфер PDF)
    const pdfBuffer = fs.readFileSync(path.join(__dirname, '../data/guides', 'Checklist-123.pdf')); //или сгенерированный

    await axios.put(uploadUrlFinal, pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf'
      }
    });

    // ШАГ 3: Получаем публичную ссылку
    const publicMeta = await axios.get(`https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(filePath)}`, {
      headers: {
        Authorization: `OAuth ${accessToken}`
      }
    });

    const downloadUrl = publicMeta.data.file;
    console.log(publicMeta.data)
    // Отдаём клиенту
    res.send(`
      <h1>PDF успешно загружен!</h1>
      <p><a href="${downloadUrl}" target="_blank">Скачать PDF</a></p>
    `);
  } catch (error) {
    console.log("Ошибка: ", error)
    throw new Error("Ошибка загрузки PDF")
  }
}