const path = require("path");
const express = require("express");
const sequelize = require("./util/database.js");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pgPool = require("./util/pgPool.js");

const app = express();
const sessionStore = new pgSession({
  pool: pgPool,
  tableName: "user_sessions",
  createTableIfMissing: true,
});

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
    },
  })
);

app.use((req, res, next) => {
  User.findByPk(1)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch((err) => console.log(err));
});

app.use("/admin", adminRoutes);
app.use(blogRoutes);
app.use(userRoutes);
app.use(authRoutes);

app.use(errorController.get404);

Comment.belongsTo(Post, { constraints: true, onDelete: "CASCADE" });
Comment.belongsTo(User, { constraints: true, onDelete: "CASCADE" });
Post.belongsTo(User);
User.hasMany(Post);

User.hasOne(Profile);
Profile.belongsTo(User);
Profile.hasMany(Comment); //, { throgh: ProfileComment }
Comment.belongsTo(Profile);

Post.hasMany(Comment);
Comment.belongsTo(Post);

User.belongsToMany(Post, { through: Like });
Post.belongsToMany(User, { through: Like, as: "likedUsers" });

Profile.hasMany(UserActivity);

sequelize
  // .sync({ force: true })
  .sync()
  .then((result) => {
    return User.findByPk(1);
  })
  .then((user) => {
    if (!user) {
      return User.create({
        username: "User1",
        email: "user@email.com",
        password: "123",
      });
    }
    return user;
  })
  .then(async (user) => {
    console.log(user.email);
    const userProfile = await user.getProfile();
    // console.log(await user.getProfile());
    if (!userProfile)
      return user.createProfile({
        firstname: "Name",
        role: "user",
        avatar: "/images/profile-avatar.png",
      });
  })
  .then((profile) => {
    app.listen(3000);
  })
  .catch((err) => console.log(err));
