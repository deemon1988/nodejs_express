const {
  sendTemplateEmail,
} = require("../send-email");
const path = require("path");
require("dotenv").config();
const { validationResult } = require("express-validator");

const crypto = require("crypto");
const User = require("../models/user");

exports.getLogin = (req, res, err) => {
  // Функция для отрисовки страницы логина
  const renderLoginPage = () => {
    res.render("user/singin", {
      pageTitle: "Авторизация",
      errorMessage: req.flash("error"),
      successMessage: req.flash("success"),
      csrfToken: req.csrfToken(),
      validationErrors: [],
      oldInput: {
        email: req.query.email || "",
        password: "",
        postId: req.query.postId || null,
      },
    });
  };
  renderLoginPage();
};

exports.postLogin = (req, res, next) => {
  const postId = req.body.postId || null;
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {

    return res.status(422).render("user/singin", {
      errorMessage: errors.array()[0].msg,
      successMessage: req.flash("success"),
      pageTitle: "Авторизация",
      csrfToken: req.csrfToken(),
      oldInput: {
        email: email,
        password: password,
        postId: postId,
      },
      validationErrors: errors.array(),
    });
  }

  let currentUser;

  User.findOne({ where: { email: email } })
    .then((user) => {
      if (!user) {
        throw new Error("Нет пользователя");
      }
      currentUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((doMatch) => {
      if (!doMatch) {
        // req.flash("error", "Введен не правильный пароль!");
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
        return res.redirect(`/posts/${postId}`);
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
    res.redirect("/");
  });
};

const bcrypt = require("bcryptjs");
const { where, Op } = require("sequelize");

exports.postRegisterUser = async (req, res, err) => {
  const username = req.body.username.trim();
  const email = req.body.email.trim();
  const password = req.body.password.trim();
  const repeatPass = req.body.repeatPass.trim();
  const templatePath = path.join(
    __dirname,
    "../views/email/email-template.ejs"
  );

  const errors = validationResult(req);
  if (!errors.isEmpty()) {

    return res.status(422).render("user/register", {
      pageTitle: "Регистрация",
      errorMessage: errors.array()[0].msg,
      csrfToken: req.csrfToken(),
      oldInput: {
        username: username,
        email: email,
        password: password,
        repeatPass: repeatPass,
      },
      validationErrors: errors.array(),
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      username: username,
      email: email,
      password: hashedPassword,
      role: "admin",
    });

    await user.save();

    const templateData = {
      name: user.username,
      email: user.email,
      password: password,
      unsubscribeLink: "https://example.com/unsubscribe?token=abc123xyz",
    };

    const mailOptions = {
      to: user.email,
      subject: "Вы успешно зарегестрировались!",
    };
    const info = await sendTemplateEmail(
      templatePath,
      templateData,
      mailOptions
    );
    console.log(info);

    req.flash("success", "Вы успешно зарегестрировались!");
    res.redirect("/singin");
  } catch (error) {
    console.log("Ошибка регистрации:", error.message);
    res.redirect("/register");
  }
};

exports.getRegisterUser = (req, res, err) => {
  const useremail = req.query.useremail || "";
  res.render("user/register", {
    pageTitle: "Регистрация",
    errorMessage: req.flash("error"),
    csrfToken: req.csrfToken(),
    validationErrors: [],

    oldInput: {
      username: "",
      email: useremail,
      password: "",
      repeatPass: "",
    },
  });
};

exports.getReset = (req, res, err) => {
  let message = req.flash("error");
  let success = req.flash("success");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  success = success.length > 0 ? success[0] : null;

  res.render("user/reset", {
    pageTitle: "Сброс пароля",
    csrfToken: req.csrfToken(),
    errorMessage: message,
    successMessage: success,
  });
};

exports.postReset = async (req, res, next) => {
  try {
    const buffer = await new Promise((resolve, reject) => {
      crypto.randomBytes(32, (err, buf) => {
        if (err) reject(err);
        else resolve(buf);
      });
    });

    const token = buffer.toString("hex");
    const user = await User.findOne({
      where: { email: req.body.email.trim() },
    });

    if (!user) {
      req.flash("error", "Аккаунт с указанным Email не найден");
      return res.redirect("/reset");
    }

    user.resetToken = token;
    user.resetTokenExpiration = Date.now() + 3600000;
    await user.save();

    req.flash(
      "success",
      "Письмо с инструкцией по сбросу пароля отправлено на ваш Email"
    );
    res.redirect("/");

    const templatePath = path.join(
      __dirname,
      "../views/email/reset-password.ejs"
    );
    const templateData = {
      username: user.username,
      resetLink: `http://localhost:3000/reset/${token}`,
    };

    const mailOptions = {
      to: req.body.email.trim(),
      subject: "Сброс пароля",
    };

    sendTemplateEmail(templatePath, templateData, mailOptions)
      .then((info) => console.log("Email sent:", info.messageId))
      .catch((err) => console.log("Email error:", err));
  } catch (err) {
    console.log(err);
    res.redirect("/reset");
  }
};

exports.getNewPassword = (req, res, err) => {
  const token = req.params.token;
  console.log(token);
  User.findOne({
    where: {
      resetToken: token,
      resetTokenExpiration: { [Op.gt]: new Date() },
    },
  })
    .then((user) => {

      // if(!user) {
      //   return res.redirect('/')
      // }
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render("user/new-password", {
        path: "/new-password",
        pageTitle: "Обновление пароля",
        errorMessage: message,
        userId: user.id,
        passwordToken: token,
        csrfToken: req.csrfToken(),
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postNewPassword = (req, res, err) => {
  const newPassword = req.body.password.trim();
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    where: {
      resetToken: passwordToken,
      resetTokenExpiration: { [Op.gt]: new Date() },
      id: userId,
    },
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = null;
      resetUser.resetTokenExpiration = null;
      return resetUser.save();
    })
    .then((result) => {
      req.flash("success", "Пароль успешно обновлен!");
      res.redirect("/singin");

      const templatePath = path.join(
        __dirname,
        "../views/email/success-reset-password.ejs"
      );
      const templateData = {
        username: resetUser.username,
        password: newPassword,
      };

      const mailOptions = {
        to: resetUser.email,
        subject: "Пароль был успешно изменен",
      };
      const info = sendTemplateEmail(templatePath, templateData, mailOptions);
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/new-password");
    });
};
