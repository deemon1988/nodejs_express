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
const fs = require('fs')

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
      // postId пока null — неизвестен
    });
    await image.save()
    // Возвращаем URL для TinyMCE
    console.log("Путь до файла", image.path)
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
    // Изображение
    if (req.files && req.files["image"]) {
      // Приоритет 1: новый файл загружен
      image = "/images/posts/" + req.files["image"][0].filename;
    } else if (req.session.tempImage) {
      // Приоритет 2: файл из сессии (был загружен ранее)
      image = req.session.tempImage;
    } else null;

    // Обложка
    if (req.files && req.files["cover"]) {
      // Приоритет 1: новый файл загружен
      cover = "/images/posts/cover/" + req.files["cover"][0].filename;
    } else if (req.session.tempCover) {
      // Приоритет 2: файл из сессии (был загружен ранее)
      cover = req.session.tempCover;
    } else null;

    // Галерея
    if (req.files && req.files['gallery']) {
      gallery = req.files['gallery'].map(file => "/images/posts/gallery/" + file.filename)
    } else if (req.session.tempGallery) {
      gallery = req.session.tempGallery.map(file => file)
    } else[]

    const errors = validationResult(req);
    // Если есть ошибки валидации
    if (!errors.isEmpty()) {
      const categories = await Category.findAll();
      // Если был загружен файл с формы, то проверяем session и удаляем если файл с диска
      // Записываем в session новый путь к файлу
      if (req.files["image"]) {
        if (req.session.tempImage) deleteFile(req.session.tempImage)
        req.session.tempImage = "/images/posts/" + req.files["image"][0].filename;
      }
      if (req.files["cover"]) {
        if (req.session.tempCover) deleteFile(req.session.tempCover)
        req.session.tempCover = "/images/posts/cover/" + req.files["cover"][0].filename;
      }
      if (req.files["gallery"]) {
        if (req.session.tempGallery) deleteFiles(req.session.tempGallery)
        req.session.tempGallery = req.files["gallery"].map(file => "/images/posts/gallery/" + file.filename);
      }

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
        errorMessage: errors.array()[0].msg,
        successMessage: null,
        validationErrors: errors.array(),
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

    const usedImages = getContentImages(cleanContent)

    await Image.update({
      postId: createdPost.id,
    },
      {
        where: {
          path: { [Op.in]: usedImages }
        }
      }
    )

    await UserActivity.create({
      profileId: userProfile.id,
      actionType: "post_created",
      targetType: "post",
      targetId: createdPost.id,
      description: `Добавлен пост "${createdPost.title}"`,
    });
    req.session.tempImage = null
    req.session.tempCover = null
    req.session.tempGallery = null
    req.flash("success", "Пост успешно добавлен!");
    return res.redirect("/admin/posts");

  } catch (err) {
    console.error("Ошибка при добавлении поста:", err);
    // req.flash("error", `Не удалось добавить пост - ${err.message}`);

    req.session.tempImage = null
    req.session.tempCover = null
    req.session.tempGallery = null

    const error = new Error(err)
    error.httpStatusCode = 500
    return next(error)
  }
};

exports.postDeletePost = async (req, res, next) => {
  try {
    const postId = req.body.postId;
    const deleteablePost = await Post.findOne({ where: { id: postId, userId: req.user.id } })
    if (!deleteablePost) {
      req.flash("error", "У вас не прав для удаления поста");
      throw new Error("Пост не найден");
    }
    const tinymce_images = await Image.findAll({ where: { postId: deleteablePost.id } })
    if (tinymce_images.length > 0) {
      const imagesPaths = tinymce_images.map(image => image.path)
      deleteFiles(imagesPaths)
    }
    if (deleteablePost.image) deleteFile(deleteablePost.image)
    if (deleteablePost.cover) deleteFile(deleteablePost.cover)
    if (deleteablePost.gallery) deleteFiles(deleteablePost.gallery)
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

    const oldImage = updatedPost.image;
    const oldCover = updatedPost.cover;
    const oldGallery = updatedPost.gallery;
    const oldTinymceImages = await Image.findAll({ where: { postId: postId } })

    let image = oldImage;
    let cover = oldCover;
    let gallery = oldGallery;


    // Изображение
    if (req.files && req.files["image"]) {
      // Приоритет 1: новый файл загружен
      image = "/images/posts/" + req.files["image"][0].filename;
    } else if (req.session.tempImage) {
      // Приоритет 2: файл из сессии (был загружен ранее)
      image = req.session.tempImage;
    }

    // Обложка
    if (req.files && req.files["cover"]) {
      cover = "/images/posts/cover/" + req.files["cover"][0].filename;
    } else if (req.session.tempCover) {
      cover = req.session.tempCover;
    }

    // Галерея — массив файлов
    if (req.files && req.files["gallery"]) {
      gallery = req.files["gallery"].map(
        (file) => "/images/posts/gallery/" + file.filename
      );
    } else if (req.session.tempGallery) {
      gallery = req.session.tempGallery;
    }


    const errors = validationResult(req).array();

    if (req.imageUploadAttempted && !req.files?.image) {
      errors.push({
        msg: 'Не поддерживаемый формат изображения. Разрешены только JPG, JPEG, PNG',
        param: 'image',
        location: 'body'
      });
    }


    if (errors.length > 0) {
      if (req.files["image"]) {
        if (req.session.tempImage) deleteFile(req.session.tempImage);
        req.session.tempImage = "/images/posts/" + req.files["image"][0].filename;
      }
      if (req.files["cover"]) {
        if (req.session.tempCover) deleteFile(req.session.tempImage);
        req.session.tempCover = "/images/posts/cover/" + req.files["cover"][0].filename;
      }
      if (req.files["gallery"]) {
        if (req.session.tempGallery) deleteFiles(req.session.tempGallery)
        req.session.tempGallery = req.files["gallery"].map(
          (file) => "/images/posts/gallery/" + file.filename
        );
      }

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

    // Если был получен файл с формы и у поста есть старое изображение
    // удаляем старое изображение с диска
    if ((req.files["image"] || req.session.tempImage) && oldImage) {
      deleteFile(oldImage);
    }

    // Если было загружено изображение с формы и есть ранее сохраненное изображение,
    // то удаляем изображение с диска по пути сохраненному в сессии
    if (req.files["image"] && req.session.tempImage) {
      deleteFile(req.session.tempImage);
    }

    updatedPost.title = updatedTitle;
    updatedPost.content = updatedContent;
    updatedPost.preview = updatedPreview;
    updatedPost.categoryId = categoryId;
    updatedPost.image = image;
    updatedPost.cover = cover;
    updatedPost.gallery = gallery;

    await updatedPost.save();

    const usedImages = getContentImages(updatedContent)
    await Image.update({
      postId: updatedPost.id,
    },
      {
        where: {
          path: { [Op.in]: usedImages }
        }
      }
    )

    const deletedImages = oldTinymceImages
      .filter(image => !usedImages.includes(image.path))
      .map(image => image.path)
    console.log("Images Удаленные из поста после обновления")
    await Image.destroy({
      where: {
        [Op.or]: [
          { path: deletedImages },         // условие 1
          { postId: null }                 // условие 2
        ]
      }
    })
    deleteFiles(deletedImages)

    req.session.tempImage = null;
    req.session.tempCover = null;
    req.session.tempGallery = null;
    res.redirect("/admin/posts");
  } catch (err) {
    console.log(err);
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
      hasError: false,
      errorMessage: req.flash("error") || null,
      successMessage: req.flash("success") || null,
      validationErrors: [],
    })
  } catch (error) {
    console.log("Ошибка: ", error)
    throw new Error("Ошибка рендеринга страницы")
  }
}


exports.getYandexDiskUrl = (req, res, next) => {
  const clientId = process.env.CLIENT_ID_DISK_API;
  const redirectUri = process.env.REDIRECT_URI_DISK_API; // должен быть настроен в Яндексе
  const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.json({ url: authUrl });
}

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
    const folder = 'guides' ;
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