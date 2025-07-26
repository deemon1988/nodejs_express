const path = require("path");
const express = require("express");
const sequelize = require("./util/database.js");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pgPool = require("./util/pgPool.js");
const { formatDateOnly } = require("./util/date");
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
const csrfProtection = csrf();

const adminRoutes = require("./routes/admin.js");
const blogRoutes = require("./routes/blog.js");
const userRoutes = require("./routes/user.js");
const authRoutes = require("./routes/auth.js");

const errorController = require("./controllers/404.js");
const Post = require("./models/post.js");
const Comment = require("./models/comment.js");
const User = require("./models/user.js");
const Profile = require("./models/profile.js");
const Like = require("./models/like.js");
const UserActivity = require("./models/user-activity.js");
const Category = require("./models/category.js");
const Alias = require("./models/allowed-alias.js");

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
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
      sameSite: "strict", // ❗️ Защита от CSRF
    },
  })
);


app.use(flash());


app.use((req, res, next) => {
  console.log(req.user)
  console.log(req.session.user)
  if (!req.session.user) {
    return next();
  }
  User.findByPk(req.session.user.id)
  .then((user) => {
    if (!user) {
      req.session.destroy();
      return res.redirect("/");
    }
    req.user = user;
    next();
  })
    .catch((err) => console.log(err));
});

// Установка res.locals глобально
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn || false;
  res.locals.userRole = req.user ? req.user.role : "user";
  res.locals.user = req.user || null;
  res.locals.formatDateOnly = formatDateOnly;
  res.locals.fixPrepositions = fixPrepositions;
  app.locals.tinyApiKey = process.env.TINY_API_KEY;
  next();
});



app.use("/admin", adminRoutes);
app.use(blogRoutes);
app.use(userRoutes);
app.use(authRoutes);

app.use(errorController.get404);

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

Category.hasOne(Alias);
Alias.belongsTo(Category);

sequelize
  // .sync({ force: true })
  .sync()
  .then((result) => {
    app.listen(3000);
  })
  .catch((err) => console.log(err));
