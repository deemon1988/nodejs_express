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


exports.getAddPost = (req, res, next) => {
  Category.findAll().then((categories) => {
    res.render("admin/edit-post", {
      pageTitle: "Создать пост",
      path: "/admin/create-post",
      editing: false,
      categories: categories,
    });
  });
};

exports.postAddPost = (req, res, next) => {
  const title = req.body.title;
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
  const cover = req.files["cover"]
    ? "/images/posts/" + req.files["cover"][0].filename
    : null;
  const logo = req.files["logo"]
    ? "/images/icons/" + req.files["logo"][0].filename
    : null;
  //  const imagePaths = req.files.map(file => "/images/posts/" + file.filename);

  Category.findOne({ where: { name: cleanCategoryName } })
    .then((foundCategory) => {
      category = foundCategory;

      return user.createPost({
        title: cleanTitle,
        content: cleanContent,
        image: cover,
        likes: 0,
      });
    })
    .then((post) => {
      createdPost = post;
      return post.setCategory(category);
    })
    .then(() => {
      return Profile.findByPk(user.id);
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
  Post.findByPk(postId)
    .then((post) => {
      return post.destroy();
    })
    .then((result) => {
      res.redirect("/admin/posts");
    })
    .catch((err) => console.log(err));
};

exports.getAllPosts = (req, res, next) => {
  Post.findAll({ include: [{ model: Category, as: "category" }] })
    .then((posts) => {
      res.render("admin/posts", {
        pageTitle: "Админ посты",
        posts: posts,
        path: "/admin/posts",
        isAuthenticated: req.session.isLoggedIn,
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

  Post.findByPk(postId)
    .then((post) => {
      if (!post) {
        throw new Error("Пост не найден");
        // return res.redirect("/admin/posts");
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
        // isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => {
      console.log("Ошибка:", err.message);
      res.redirect("/admin/posts");
    });
};

exports.postEditPost = (req, res, next) => {
  const postId = req.body.postId;
  const updatedTitle = req.body.title;
  const updatedContent = req.body.content;
  const categoryId = req.body.category;

  Post.findByPk(postId)
    .then((post) => {
      let imageUrl = post.image;
      post.title = updatedTitle;
      post.content = updatedContent;
      post.categoryId = categoryId;
      if (req.file) imageUrl = "/images/posts/" + req.file.filename;
      post.image = imageUrl;
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
      return Alias.create({ name: name });
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

exports.getCreateCategory = (req, res, next) => {
  const editMode = req.query.edit;
  let existsAliases;

  Alias.findAll()
    .then((aliases) => {
      existsAliases = aliases;
      return Category.findAll();
    })
    .then((categories) => {
      res.render("admin/create-category", {
        categories: categories,
        aliases: existsAliases,
        pageTitle: "Добавить категорию",
        path: "/admin/create-category",
        editing: editMode,
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
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/admin/create-category");
  }
  const categoryId = req.params.categoryId;

  let updatedCategory;
  let existsAliases;
  Category.findByPk(categoryId)
    .then((category) => {
      if (!category) {
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
      });
    })
    .catch((err) => console.log(err));
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
    .then((result) => res.redirect("/admin/create-category"))
    .catch((err) => console.log(err));
};
