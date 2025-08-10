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
      errorMessage: req.flash("error") || null,
      successMessage: req.flash("success") || null,
      validationErrors: [],
    });
  });
};

exports.postAddPost = async (req, res, next) => {
  try {
    console.log("Временные файлы галлереи в сессии - ", req.session.tempGallery)
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
    await updateTinyMceImages(createdPost.id, usedImages)

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

exports.postDeletePost = async (req, res, next) => {
  try {
    const postId = req.body.postId;
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
    res.redirect("/admin/posts");
  } catch (err) {
    console.log(err);
    req.flash("error", `Не получилось удалить пост: ${err.message}`);
    res.redirect("/admin/posts");
  }
};

exports.getAllPosts = (req, res, next) => {
  let message = req.flash("error");
  let success = req.flash("success");
  message = message.length > 0 ? message[0] : null;
  success = success.length > 0 ? success[0] : null;

  Post.findAll({
    where: { userId: req.user.id },
    include: [{ model: Category, as: "category" }],
  })
    .then((posts) => {
      res.render("admin/posts", {
        pageTitle: "Админ посты",
        posts: posts,
        path: "/admin/posts",
        csrfToken: req.csrfToken(),
        errorMessage: message,
        successMessage: success,
      });
    })
    .catch((err) => console.log(err));
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
    await updateTinyMceImages(updatedPost.id, usedImages)

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
    return next(error)
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
        return alias.destroy();
      }
      alias.name = updatedName;
      return alias.save();
    })
    .then((result) => res.redirect("/admin/create-category"))
    .catch((err) => console.log(err));
};

exports.postDeleteCategory = (req, res, next) => {
  const categoryId = Number(req.body.categoryId);

  Category.findOne({
    where: { id: categoryId },
    include: [
      {
        model: Alias,
        as: "alias",
        where: {
          userId: req.user.id,
        },
      },
    ],
  })
    .then((category) => {
      console.log(category);
      if (!category) {
        req.flash("error", "У вас нет прав для удаления категории");
        throw new Error("Категория не найдена или не принадлежит пользователю");
      }
      return category.destroy();
    })
    .then((result) => {
      req.flash("success", "Категория удалена");
      res.redirect("/admin/create-category");
    })
    .catch((err) => {
      console.log("Ошибка удаления категории: ", err);
      res.redirect("/admin/create-category");
    });
};

exports.getCreateCategory = (req, res, next) => {
  let success = req.flash("success");
  let message = req.flash("error");
  success = success.length > 0 ? success[0] : null;
  message = message.length > 0 ? message[0] : null;

  const editMode = req.query.edit;
  let existsAliases;

  Alias.findAll({
    where: { userId: req.user.id },
    include: [
      {
        model: Category,
        required: false, // чтобы получить aliases даже без категорий
      },
    ],
  })
    .then((aliases) => {
      existsAliases = aliases;

      return aliases
        .map((alias) => (alias.category ? alias.category.dataValues : null))
        .filter((category) => category !== null);
    })
    .then((categories) => {
      console.log(categories);
      res.render("admin/create-category", {
        categories: categories,
        aliases: existsAliases,
        pageTitle: "Добавить категорию",
        path: "/admin/create-category",
        editing: editMode,
        csrfToken: req.csrfToken(),
        errorMessage: message,
        successMessage: success,
      });
    })
    .catch((err) => console.log(err));
};

exports.postCreateCategory = (req, res, next) => {
  const aliasId = req.body.aliasId;
  const name = req.body.name.trim();
  const tagline = req.body.tagline.trim();
  const description = req.body.description.trim();
  const logo = req.file ? "/images/category/" + req.file.filename : null;

  const cleanName = sanitizeHtml(name, {
    allowedTags: [],
    allowedAttributes: {},
  });
  const cleanTagline = cleanInput(tagline);

  let cleanDescription;
  if (description) {
    cleanDescription = cleanInput(description);
  }
  // if (!req.file) {
  //   // Вместо throw — возвращаем Promise.reject()
  //   return Promise.reject(new Error("Ошибка создания категории")).catch(
  //     (err) => {
  //       console.log("Ошибка создания категории", err.message);
  //       res.redirect("/admin/create-category");
  //     }
  //   );
  // }

  let existAlias;
  let createdCategory;

  Alias.findByPk(aliasId)
    .then((alias) => {
      if (!alias) {
        throw new Error("Alias не найден");
      }
      if (alias.categoryId) {
        throw new Error("Категория уже существует");
      }
      existAlias = alias;
      return Category.findOne({ where: { name: cleanName } });
    })
    .then((findedCategory) => {
      if (findedCategory) {
        throw new Error("Категория уже существует");
      }
      return Category.create({
        name: cleanName,
        tagline: cleanTagline,
        description: cleanDescription,
        image: logo,
      });
    })
    .then((category) => {
      createdCategory = category;
      return existAlias.setCategory(createdCategory);
    })
    .then((result) => {
      res.redirect("/admin/create-category");
    })
    .catch((err) => {
      console.log("Ошибка создания категории:", err.message);
      res.redirect("/admin/create-category");
    });
};

exports.getEditCategory = (req, res, next) => {
  let success = req.flash("success");
  let message = req.flash("error");
  success = success.length > 0 ? success[0] : null;
  message = message.length > 0 ? message[0] : null;

  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/admin/create-category");
  }
  const categoryId = req.params.categoryId;

  let updatedCategory;
  let existsAliases;

  Category.findOne({
    where: { id: categoryId },
    include: [
      {
        model: Alias,
        as: "alias",
        where: {
          userId: req.user.id,
        },
      },
    ],
  })
    .then((category) => {
      if (!category) {
        req.flash("error", "Категория для редактирования не найдена");
        throw new Error("Категория не существует");
      }
      updatedCategory = category;
      return Alias.findAll();
    })
    .then((aliases) => {
      if (!aliases) {
        throw new Error("Алиасы не найдены");
      }
      existsAliases = aliases;
      return Category.findAll();
    })
    .then((categories) => {
      if (!categories) {
        throw new Error("Категории не найдены");
      }
      res.render("admin/create-category", {
        pageTitle: "Редактировать категорию",
        path: "/admin/create-category",
        editing: editMode,
        aliases: existsAliases,
        category: updatedCategory,
        categories: categories,
        csrfToken: req.csrfToken(),
        errorMessage: message,
        successMessage: success,
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/admin/create-category");
    });
};

exports.postEditCategory = (req, res, next) => {
  const categoryId = req.body.categoryId;
  const updatedName = req.body.name;
  const updatedTagline = req.body.tagline;
  const updatedDescription = req.body.description;
  const aliasId = req.body.aliasId;
  let existAlias;

  Alias.findByPk(aliasId)
    .then((alias) => {
      existAlias = alias;
      return Category.findByPk(categoryId);
    })
    .then((category) => {
      if (
        existAlias.categoryId === "null" ||
        existAlias.categoryId === "undefined" ||
        existAlias.categoryId !== category.id
      ) {
        existAlias.setCategory(category);
      }
      let logoUrl = category.image;
      category.name = updatedName;
      category.tagline = updatedTagline;
      category.description = updatedDescription;
      if (req.file) logoUrl = "/images/category/" + req.file.filename;
      category.image = logoUrl;
      return category.save();
    })
    .then((result) => {
      req.flash("success", "Категория успешно отредактирована!");
      res.redirect("/admin/create-category");
    })
    .catch((err) => console.log(err));
};

exports.getAddGuide = async (req, res, next) => {
  try {
    const categories = await Category.findAll()
    res.render('admin/add-guide', {
      pageTitle: "Добавить гайд",
      path: "/admin/add-guide",
      editing: false,
      categories: categories,
      csrfToken: req.csrfToken(),
      errorMessage: req.flash("error"),
      successMessage: req.flash("success"),
      hasError: false,
      validationErrors: [],
    })
  } catch (error) {
    console.log("Ошибка: ", error)
    throw new Error("Ошибка рендеринга страницы")
  }
}

exports.postAddGuide = async (req, res, next) => {
  try {
    const { title, preview, content, fileUrl, fileType, fileSize, contentType } = req.body;
    const userId = req.user.id
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

    const errors = validationResult(req);
    // Если есть ошибки валидации
    if (!errors.isEmpty()) {
      const categories = await Category.findAll();
      // Если был загружен файл с формы, то проверяем session и удаляем если файл с диска
      // Записываем в session новый путь к файлу
      // if (req.files["image"]) {
      //   if (req.session.tempImage) deleteFile(req.session.tempImage)
      //   req.session.tempImage = "/images/guides/" + req.files["image"][0].filename;
      // }
      // if (req.files["cover"]) {
      //   if (req.session.tempCover) deleteFile(req.session.tempCover)
      //   req.session.tempCover = "/images/guides/cover/" + req.files["cover"][0].filename;
      // }
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
          contentType: contentType
        },

        pageTitle: "Добавить гайд",
        path: "/admin/add-guide",
        editing: false,
        categories: categories,
        csrfToken: req.csrfToken(),
        errorMessage: req.flash("error"),
        successMessage: req.flash("success"),
        hasError: false,
        validationErrors: [],
      });
    }

    const createdGuide = await Guide.create({
      title,
      preview,
      content,
      fileUrl,
      fileType,
      fileSize,
      contentType: contentType
    });

    const usedImages = getContentImages(cleanContent)

    await Image.update({
      entityId: createdGuide.id,
      entityType: 'guide'
    },
      {
        where: {
          path: { [Op.in]: usedImages }
        }
      }
    )


    await createUserActivity(userId, "guide_created", "guide", createdGuide.id, `Добавлен материал "${createdGuide.title}"`)

    req.session.tempImage = null
    req.session.tempCover = null

    req.flash('success', 'Успешно добавлено');
    return res.redirect('/library');

  } catch (err) {
    console.error("Ошибка при добавлении гайда:", err); // ← должно выводиться
    req.flash("error", `Не удалось добавить гайд - ${err.message}`);
    req.session.tempImage = null
    req.session.tempCover = null
    const error = new Error(err.message);
    error.httpStatusCode = 500;
    return next(error); // ← передаём ошибку
  }
};


exports.getYandexDiskUrl = (req, res, next) => {
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

    req.session.yandexDiskAccessToken = accessToken
    await req.session.save()

    req.flash("success", "Успешная авторизация, теперь можно получить ссылку");
    res.redirect('/admin/add-guide')

  } catch (error) {
    console.log("Ошибка: ", error)
    throw new Error("Ошибка получения и сохранения токена")
  }
}


exports.getDownloadLink = async (req, res) => {
  const fileName = req.query.fileName;

  try {
    const yandexDiskAccessToken = req.yandexDiskAccessToken;

    if (!yandexDiskAccessToken) {
      console.log("access token - ", yandexDiskAccessToken)
      req.flash("error", "Требуется авторизация Яндекс ID!");
      return res.status(403).json({
        error: 'Требуется авторизация',
        redirect: '/admin/add-guide'
      });
    }

    const path = `guides/${fileName}`;

    // Получаем метаданные
    const response = await axios.get(`https://cloud-api.yandex.net/v1/disk/resources`, {
      params: { path },
      headers: { Authorization: `${yandexDiskAccessToken}` }
    });

    const publicUrl = response.data.file;
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