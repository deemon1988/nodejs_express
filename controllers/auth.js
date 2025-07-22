const User = require("../models/user");

exports.getLogin = (req, res, err) => {
  res.render("user/singin", {
    pageTitle: "Авторизация",
    errorMessage: req.flash("error"),
    successMessage: req.flash("success"),
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  let currentUser;

  User.findOne({ where: { email: email } })
    .then((user) => {
      if (!user) {
        req.flash("error", "Неверный адрес электронной почты или пароль!");
        throw new Error("Нет пользователя");
      }
      currentUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((doMatch) => {
      if (!doMatch) {
        req.flash("error", "Неверный адрес электронной почты или пароль!");
        throw new Error("Неверный пароль");
      }
      req.session.isLoggedIn = true;
      req.session.user = currentUser;
      return new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    })
    .then(() => {
      return currentUser.getProfile();
    })
    .then((profileData) => {
      if (!profileData) {
        return currentUser.createProfile({
          firstname: currentUser.username,
          avatar: "/images/profile-avatar.png",
        });
      }
      return profileData;
    })
    .then((profile) => {
      if (!profile) {
        throw new Error("Профиль не создан");
      }
      req.flash("success", "Вы успешно авторизовались!");
      res.redirect("/");
    })
    .catch((err) => {
      console.error("Ошибка входа:", err.message);
      res.redirect("/singin"); // Здесь только один redirect
    });
};

exports.postLogout = (req, res, err) => {
  req.session.destroy((err) => {
    console.log(err);
  });
  res.redirect("/");
};

const bcrypt = require("bcryptjs");

exports.postRegisterUser = (req, res, err) => {
  const username = req.body.username;
  const email = req.body.email.trim();
  const password = req.body.password;
  const repeatPass = req.body.repeatPass;

  User.findOne({ where: { email: email } })
    .then((userDoc) => {
      if (userDoc) {
        req.flash(
          "error",
          "Пользователь с этим адресом электронной почты уже зарегистрирован!"
        );
        throw new Error("Email уже зарегистрирован");
        // return res.redirect("/register");
      }
      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            username: username,
            email: email,
            password: hashedPassword,
            role: "admin",
          });
          return user.save();
        })
        .then((result) => {
          res.redirect("/singin");
        });
    })
    .catch((err) => {
      console.log("Ошибка регистрации:", err.message);
      res.redirect("/register");
    });
};

exports.getRegisterUser = (req, res, err) => {
  res.render("user/register", {
    pageTitle: "Регистрация",
    errorMessage: req.flash("error"),
  });
};
