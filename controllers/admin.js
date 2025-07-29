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

exports.postAddImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Файл не загружен" });
  }
  // Путь, который вернётся в редактор
  const imageUrl = `/images/posts/${req.file.filename}`;
  // TinyMCE ожидает { location: '...' }
  res.json({ location: imageUrl });
};

exports.getAddPost = (req, res, next) => {
  Category.findAll().then((categories) => {
    res.render("admin/edit-post", {
      pageTitle: "Создать пост",
      path: "/admin/create-post",
      editing: false,
      categories: categories,
      csrfToken: req.csrfToken(),
      hasError: false
    });
  });
};

exports.postAddPost = (req, res, next) => {
  const title = req.body.title.trim();
  const content = req.body.content;
  const categoryName = req.body.category;
  const user = req.user;

  const cleanTitle = sanitizeHtml(title, {
    allowedTags: [],
    allowedAttributes: {},
  });
  const cleanContent = cleanInput(content);
  const cleanCategoryName = sanitizeHtml(categoryName, {
    allowedTags: [],
    allowedAttributes: {},
  });

  let createdPost;
  let category;
  if (!req.files) {
    throw new Error("Ошибка создания поста");
  }
  const image = req.files["image"]
    ? "/images/posts/" + req.files["image"][0].filename
    : null;
  const cover = req.files["cover"]
    ? "/images/posts/cover/" + req.files["cover"][0].filename
    : null;

  // Галерея — массив файлов
  const gallery = req.files["gallery"]
    ? req.files["gallery"].map(
        (file) => "/images/posts/gallery/" + file.filename
      )
    : [];

  Category.findOne({ where: { name: cleanCategoryName } })
    .then((foundCategory) => {
      category = foundCategory;

      return user.createPost({
        title: cleanTitle,
        content: cleanContent,
        image: image,
        cover: cover,
        gallery: gallery,
        likes: 0,
      });
    })
    .then((post) => {
      createdPost = post;
      return post.setCategory(category);
    })
    .then(() => {
      return Profile.findOne({ where: { userId: user.id } });
    })
    .then((profile) => {
      UserActivity.create({
        profileId: profile.id,
        actionType: "post_created",
        targetType: "post",
        targetId: createdPost.id,
        description: `Добавлен пост "${createdPost.title}"`,
      });
    })
    .then((result) => {
      return res.redirect("/admin/posts");
    })
    .catch((err) => {
      console.log(err.message);
      res.redirect("/admin/create-post");
    });
};

exports.postDeletePost = (req, res, next) => {
  const postId = req.body.postId;
  Post.findOne({ where: { id: postId, userId: req.user.id } })
    .then((post) => {
      if (!post) {
        req.flash("error", "У вас не прав для удаления поста");
        throw new Error("Пост не найден");
      }
      return post.destroy();
    })
    .then((result) => {
      req.flash("success", "Пост был удален");
      res.redirect("/admin/posts");
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/admin/posts");
    });
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
        hasError: false
      });
    })
    .catch((err) => {
      console.log("Ошибка:", err.message);
      res.redirect("/admin/posts");
    });
};

exports.postEditPost = async (req, res, next) => {
  const postId = req.body.postId;
  const updatedTitle = req.body.title.trim();
  const updatedContent = req.body.content;
  const categoryId = req.body.category;
  const oldImage = req.body.oldImage;

  if (!req.files) {
    throw new Error("Ошибка создания поста");
  }
  const image = req.files["image"]
    ? "/images/posts/" + req.files["image"][0].filename
    : oldImage;
  const cover = req.files["cover"]
    ? "/images/posts/cover/" + req.files["cover"][0].filename
    : null;

  // Галерея — массив файлов
  const gallery = req.files["gallery"]
    ? req.files["gallery"].map(
        (file) => "/images/posts/gallery/" + file.filename
      )
    : JSON.parse(req.body.oldGallery || '[]');

  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    console.log("Image", gallery);
    return res.status(422).render("admin/edit-post", {
      pageTitle: "Редактировать пост",
      path: "/admin/edit-post",
      editing: true,
      hasError: true,
      post: {
        title: updatedTitle,
        content: updatedContent,
        image: image,
        gallery: gallery
      },
      categories: [],
      csrfToken: req.csrfToken(),
    });
  }

  Post.findByPk(postId)
    .then((post) => {
      if (post.userId !== req.user.id) {
        return res.redirect("/admin/posts");
      }
      post.title = updatedTitle;
      post.content = updatedContent;
      post.categoryId = categoryId;
      if (image) {
        post.image = image;
      }
      if (cover) {
        post.cover = cover;
      }
      if (gallery.length > 0) {
        post.gallery = gallery;
      }

      return post.save();
    })
    .then((result) => res.redirect("/admin/posts"))
    .catch((err) => console.log(err));
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
