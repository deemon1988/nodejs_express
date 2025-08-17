const path = require("path");
const express = require("express");
const sequelize = require("./util/database.js");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pgPool = require("./util/pgPool.js");
const { formatDateOnly, formatDate } = require("./util/date");
const { fixPrepositions } = require("./util/fixPrepositions.js");
const csrf = require("csurf");
const flash = require("connect-flash");

const app = express();
const sessionStore = new pgSession({
  pool: pgPool,
  tableName: "user_sessions",
  createTableIfMissing: true,
  pruneSessionInterval: 60 * 60 * 24, // Чистка раз в день
});
// const csrfProtection = csrf();

const adminRoutes = require("./routes/admin.js");
const blogRoutes = require("./routes/blog.js");
const userRoutes = require("./routes/user.js");
const authRoutes = require("./routes/auth.js");
const accessRoutes = require("./routes/access.js");

const errorController = require("./controllers/404.js");
const Post = require("./models/post.js");
const Comment = require("./models/comment.js");
const User = require("./models/user.js");
const Profile = require("./models/profile.js");
const Like = require("./models/like.js");
const UserActivity = require("./models/user-activity.js");
const Category = require("./models/category.js");
const Alias = require("./models/allowed-alias.js");
const Image = require("./models/image.js");
const YandexAccount = require('./models/yandex-account.js')
const Guide = require('./models/guide.js');
const Payment = require("./models/payment.js");
const Subscription = require("./models/subscription.js");

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use('/images', express.static(path.join(__dirname, "images")));
app.use(express.json());

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 день
      httpOnly: true, // ❗️ Защищает от XSS
      // secure: process.env.NODE_ENV === "production", // ❗️ Только по HTTPS
      sameSite: "lax", // ❗️ (strict) Защита от CSRF
    },
  })
);

// app.use(csrfProtection)
app.use(flash());
// Устанавливаем базовые locals — до получения user
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn || false;
  res.locals.formatDateOnly = formatDateOnly;
  res.locals.formatDate = formatDate;
  res.locals.fixPrepositions = fixPrepositions;
  next();
});


app.use((req, res, next) => {
  if (!req.session.userId) {
    return next();
  }
  User.findByPk(req.session.userId)
    .then((user) => {
      if (!user) {
        req.session.destroy();
        return res.redirect("/");
      }

      req.user = user;
      next();
    })
    .catch((err) => {
      console.log(err)
      next(new Error(err))
    });
});


// Устанавливаем оставшиеся переменные после получения пользователя
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.userRole = req.user ? req.user.role : "user";
  app.locals.tinyApiKey = process.env.TINY_API_KEY;
  res.locals.yandexDiskAccessToken = req.session.yandexDiskAccessToken ? req.session.yandexDiskAccessToken : null
  next();
});

app.use((req, res, next) => {
  req.imageUploadAttempted = false;
  req.coverUploadAttempted = false;
  req.galleryUploadAttempted = false;
  req.galleryFilesAttempted = []; // Массив для отслеживания отдельных файлов галереи
  next();
});


app.use("/admin", adminRoutes);
app.use(blogRoutes);
app.use(userRoutes);
app.use(authRoutes);
app.use("/access", accessRoutes);

// app.get('/500', errorController.get500);
app.use(errorController.get404);
// app.use(errorController.get500);
// app.use((error, req, res, next) => {
//   res.status(500).render("500", {
//     pageTitle: "Ошибка!", path: '/500',
//   });
// });



Comment.belongsTo(Post, { constraints: true, onDelete: "CASCADE" });
Post.hasMany(Comment);

Comment.belongsTo(User, { constraints: true, onDelete: "CASCADE" });
User.hasMany(Comment);

Post.belongsTo(User);
User.hasMany(Post);

User.hasOne(Profile);

User.belongsToMany(Post, { through: Like });
Post.belongsToMany(User, { through: Like, as: "likedUsers" });

Profile.hasMany(UserActivity);

Category.hasMany(Post);
Post.belongsTo(Category, { as: "category" });

Category.hasOne(Alias, { onDelete: "CASCADE" });
Alias.belongsTo(Category);

Alias.belongsTo(User);
User.hasMany(Alias);

User.hasOne(YandexAccount)

Category.belongsToMany(Guide, { through: 'Category_Guide' })
Guide.belongsToMany(Category, { through: 'Category_Guide' })

Payment.belongsTo(User);
Payment.belongsTo(Guide);

Subscription.belongsTo(User);

sequelize
  // .sync({ force: true })
  .sync()
  .then((result) => {
    app.listen(3000);
  })
  .catch((err) => console.log(err));
