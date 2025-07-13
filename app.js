const path = require("path");
const express = require("express");
const sequelize = require("./util/database.js");

const app = express();

const adminRoutes = require("./routes/admin.js");
const blogRoutes = require("./routes/blog.js");
const userRoutes = require("./routes/user.js");
const errorController = require("./controllers/404.js");
const Post = require("./models/post.js");
const Comment = require("./models/comment.js");
const User = require("./models/user.js");
const Profile = require("./models/profile.js");

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

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

app.use(errorController.get404);

Comment.belongsTo(Post, { constraints: true, onDelete: "CASCADE" });
Comment.belongsTo(User, { constraints: true, onDelete: "CASCADE" });
Post.belongsTo(User);
User.hasMany(Post);

User.hasOne(Profile);
Profile.belongsTo(User)
Profile.hasMany(Comment); //, { throgh: ProfileComment }
Comment.belongsTo(Profile);

Post.hasMany(Comment);
Comment.belongsTo(Post);

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
  .then((user) => {
    return user.createProfile();
  })
  .then((profile) => {
    app.listen(3000);
  })
  .catch((err) => console.log(err));
