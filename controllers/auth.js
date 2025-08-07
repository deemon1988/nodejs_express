const {
  sendTemplateEmail,
} = require("../send-email");
const path = require("path");
require("dotenv").config();
const { validationResult } = require("express-validator");
const axios = require('axios')
const qs = require('querystring');
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
        throw new Error("Неверный пароль");
      }
      req.session.isLoggedIn = true;
      req.session.userId = currentUser.id;
      return new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    })
    .then(async () => {
      return await getOrUpdateProfile(currentUser)
    })

    .then((profile) => {
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

async function getOrUpdateProfile(user) {
  try {
    const yandexAccount = await YandexAccount.findOne({ where: { default_email: user.email } })
    const avatarPath = '/images/profile-avatar.png'
    const [profile, created] = await Profile.findOrCreate({
      where: { userId: user.id },
      defaults: {
        firstname: user.username || 'User',
        avatar: avatarPath,
        userId: user.id
      }
    })
    // Флаги для определения, нужно ли обновлять
    let updateData = {};
    // Обновляем firstname, если пришёл из Яндекса и отличается
    if (yandexAccount?.first_name && profile.firstname !== yandexAccount.first_name) {
      updateData.firstname = yandexAccount.first_name;
    }
    // Обновляем lastname, если пришёл из Яндекса и отличается
    if (yandexAccount?.last_name && profile.lastname !== yandexAccount.last_name) {
      updateData.lastname = yandexAccount.last_name;
    }
    // Если нужно обновить — делаем
    if (Object.keys(updateData).length > 0) {
      await profile.update(updateData);
    } else {
    }

    return profile
  } catch (error) {
    console.error("Ошибка создания/обновления профиля:", error);
    throw new Error("Не удалось создать профиль пользователя");
  }
}

exports.postLogout = (req, res, err) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

const bcrypt = require("bcryptjs");
const { where, Op } = require("sequelize");
const YandexAccount = require("../models/yandex-account");
const Profile = require("../models/profile");

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

    const [user, created] = await User.findOrCreate({
      where: { email: email },
      defaults: {
        username: username,
        email: email,
        password: hashedPassword,
        role: "user",
      }
    });

    // Теперь user — это настоящий экземпляр модели!
    // Если пользователь уже существовал, то created = false, и мы его обновляем ниже
    if (!created) {
      // Обновляем только если нужно
      await user.update({
        username: username,
        password: hashedPassword,
      });
    }


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

exports.getYandexAuthUrl = (req, res, next) => {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = 'http://localhost:3000/oauth/yandex/callback'; // должен быть настроен в Яндексе
  const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.json({ url: authUrl });
}


exports.getAuthCallback = async (req, res, next) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Ошибка: не получен code');
  }

  try {
    // Получение access_token
    const tokenResponse = await axios.post('https://oauth.yandex.ru/token',
      qs.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: 'http://localhost:3000/oauth/yandex/callback'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in; // обычно 3600 секунд = 1 час
    const expireTime = Date.now() + expiresIn * 1000;
    
    req.session.accessToken = accessToken;
    req.session.tokenExpireTime = expireTime;

    // Получение информации о пользователе
    const userInfoResponse = await axios.get('https://login.yandex.ru/info', {
      headers: {
        Authorization: `OAuth ${accessToken}`
      }
    });

    const userInfo = userInfoResponse.data;

    const [currentUser, userCreated] = await User.findOrCreate({
      where: { email: userInfo.default_email },
      defaults: {
        email: userInfo.default_email
      }
    })

    const [yandexAccount, accountCreated] = await YandexAccount.findOrCreate({
      where: { yandexId: userInfo.id },
      defaults: {
        yandexId: userInfo.id,
        login: userInfo.login,
        client_id: userInfo.client_id,
        display_name: userInfo.display_name,
        real_name: userInfo.real_name,
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        default_email: userInfo.default_email,
        birthday: userInfo.birthday,
        default_avatar_id: userInfo.default_avatar_id,
        is_avatar_empty: userInfo.is_avatar_empty
      }
    })

    if (!yandexAccount.userId) {
      await yandexAccount.update({ userId: currentUser.id });
    } else if (yandexAccount.userId !== currentUser.id) {
      // Аккаунт уже привязан к другому пользователю!
      throw new Error('Этот аккаунт Яндекса уже привязан к другому пользователю.')
    }

    let avatarUrl = '/images/profile-avatar.png'
    const defaultAvatarId = yandexAccount?.default_avatar_id;
    const isAvatarEmpty = yandexAccount?.is_avatar_empty;

    if (defaultAvatarId && !isAvatarEmpty) {
      avatarUrl = `https://avatars.yandex.net/get-yapic/${defaultAvatarId}/`;
    }

    const [profile, profileCreated] = await Profile.findOrCreate({
      where: { userId: currentUser.id },
      defaults: {
        firstname: yandexAccount.first_name,
        lastname: yandexAccount.last_name,
        avatar: avatarUrl,
        userId: currentUser.id
      }
    })
    // Здесь можно сохранить пользователя в сессию или базу
    req.session.isLoggedIn = true;
    req.session.userId = currentUser.id;

    await req.session.save()
    req.flash("success", "Вы успешно авторизовались!");
    return res.redirect('/')

  } catch (error) {
    console.error(error.response?.data || error.message);
    next(error)
  }

}

