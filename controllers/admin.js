const Category = require("../models/category");
const Post = require("../models/post");
const Profile = require("../models/profile");
const User = require("../models/user");
const UserActivity = require("../models/user-activity");

exports.getAddPost = (req, res, next) => {
  Category.findAll()
  .then(categories => {
     res.render("admin/edit-post", {
    pageTitle: "Создать пост",
    path: "/admin/create-post",
    editing: false,
    categories: categories
    // isAuthenticated: req.session.isLoggedIn,
  })
  })
};

exports.postAddPost = (req, res, next) => {
  const title = req.body.title;
  const content = req.body.content;
  const categoryTitle = req.body.category;
  const user = req.user;

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

  // Category.findOne({ where: { name: categoryName } })
  //   .then((findedCategory) => {
  //     if (!findedCategory) {
  //       return Category.create({ name: categoryName, image: logo });
  //     }
  //     return findedCategory;
  //   })
  //   .then((cat) => {
  //     category = cat;
  //     return cat.save();
  //   })
  Category.findOne({ where: { title: categoryTitle } })
  //   .then((findedCategory) => {
    .then((foundCategory) => {
      category = foundCategory
      return user.createPost({
        title: title,
        content: content,
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
  if (!editMode) {
    return res.redirect("/admin/posts");
  }
  const postId = req.params.postId;
  // req.user.getPosts({where: {id: postId}})
  Post.findByPk(postId)
    .then((post) => {
      // const post = posts[0]
      if (!post) {
        return res.redirect("/admin/posts");
      }
      res.render("admin/edit-post", {
        pageTitle: "Редактировать пост",
        path: "/admin/edit-post",
        editing: editMode,
        post: post,
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => console.log(err));
};

exports.postEditPost = (req, res, next) => {
  const postId = req.body.postId;
  const updatedTitle = req.body.title;
  const updatedContent = req.body.content;
  const updatedCategory = req.body.category;

  Post.findByPk(postId)
    .then((post) => {
      let imageUrl = post.image;
      post.title = updatedTitle;
      post.content = updatedContent;
      post.category = updatedCategory;
      if (req.file) imageUrl = "/images/posts/" + req.file.filename;
      post.image = imageUrl;
      return post.save();
    })
    .then((result) => res.redirect("/admin/posts"))
    .catch((err) => console.log(err));
};

exports.getCreateCategory = (req, res, next) => {
  const editMode = req.query.edit;
  Category.findAll()
    .then((categories) => {
      res.render("admin/create-category", {
        categories: categories,
        pageTitle: "Добавить категорию",
        path: "/admin/create-category",
        editing: editMode,
        // isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => console.log(err));
};

exports.postCreateCategory = (req, res, next) => {
  const title = req.body.title.trim();
  const name = req.body.name.trim();

  if (!req.file) {
    throw new Error("Ошибка создания категории");
  }
  const logo = "/images/category/" + req.file.filename;
  Category.findOne({ where: { name: name } })
    .then((findedCategory) => {
      if (findedCategory) {
        throw new Error("Категория уже существует");
      }
      return Category.create({ title: title, name: name, image: logo });
    })
    .then((category) => {
      res.redirect("/admin/create-category");
    })
    .catch((err) => {
      console.log("Ошибка создания категории", err.message);
      res.redirect("/admin/create-category");
    });
};

// exports.getEditPost = (req, res, next) => {
//   const editMode = req.query.edit;
//   if (!editMode) {
//     return res.redirect("/admin/posts");
//   }
//   const postId = req.params.postId;
//   // req.user.getPosts({where: {id: postId}})
//   Post.findByPk(postId)
//     .then((post) => {
//       // const post = posts[0]
//       if (!post) {
//         return res.redirect("/admin/posts");
//       }
//       res.render("admin/edit-post", {
//         pageTitle: "Редактировать пост",
//         path: "/admin/edit-post",
//         editing: editMode,
//         post: post,
//         isAuthenticated: req.session.isLoggedIn,
//       });
//     })
//     .catch((err) => console.log(err));
// };
