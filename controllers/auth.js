const User = require("../models/user");

exports.getLogin = (req, res, err) => {
  const userDoc = {
    comment: req.query.comment || null,
    postId: req.query.postId || null,
    email: req.query.email || null,
  };
    // Функция для отрисовки страницы логина
  const renderLoginPage = () => {
    res.render("user/singin", {
      pageTitle: "Авторизация",
      errorMessage: req.flash("error"),
      successMessage: req.flash("success"),
      csrfToken: req.csrfToken(),
      userDoc: userDoc,
    });
  };
  if (userDoc.comment) {
    User.findOne({ where: { email: userDoc.email } })
      .then((user) => {
        if (!user) {
          return res.redirect(
            `/register?useremail=${encodeURIComponent(userDoc.email)}`
          );
        }
        return renderLoginPage()
      })
      .catch((err) => console.log(err));
  } else {
  renderLoginPage()
};
}

exports.postLogin = (req, res, next) => {
  const postId = req.body.postId || null;
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
      if (postId) {
        return res.redirect(`/posts/${postId}#comments`);
      }
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

exports.postRegisterUser = async (req, res, err) => {
  const username = req.body.username;
  const email = req.body.email.trim();
  const password = req.body.password;
  const repeatPass = req.body.repeatPass;

  try {
    const userDoc = await User.findOne({ where: { email: email } });
    if (userDoc) {
      req.flash(
        "error",
        "Пользователь с этим адресом электронной почты уже зарегистрирован!"
      );
      throw new Error("Email уже зарегистрирован");
    }

    if (password !== repeatPass) {
      req.flash("error", "Введенные пароли не совпадают!");
      throw new Error("Пароли не совпадают");
    }
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      username: username,
      email: email,
      password: hashedPassword,
      role: "admin",
    });

    await user.save();

    req.flash("success", "Вы успешно зарегестрировались!");
    res.redirect("/singin");
  } catch (error) {
    console.log("Ошибка регистрации:", error.message);
    res.redirect("/register");
  }
};

exports.getRegisterUser = (req, res, err) => {
  const useremail = req.query.useremail || null;
  res.render("user/register", {
    pageTitle: "Регистрация",
    errorMessage: req.flash("error"),
    csrfToken: req.csrfToken(),
    useremail: useremail,
  });
};
