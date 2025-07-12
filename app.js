const path = require("path");
const express = require("express");

const app = express();

const adminRoutes = require("./routes/admin.js");
const blogRoutes = require("./routes/blog.js");
const userRoutes = require("./routes/user.js")
const errorController = require("./controllers/404.js")

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/admin", adminRoutes);
app.use(blogRoutes);
app.use(userRoutes)

app.use(errorController.get404);

app.listen(3000);

