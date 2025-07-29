const authController = require("../controllers/auth");
const express = require("express");
const router = express.Router();
const csrf = require("csurf");
const csrfProtection = csrf();
const { check, body } = require("express-validator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

router.get("/singin", csrfProtection, authController.getLogin);
router.post(
  "/singin",
  csrfProtection,
  [
    check("email")
      .isEmail()
      .withMessage("Пожалуйста введите правильный адрес электронной почты")
      .normalizeEmail()
      .custom((value, { req }) => {
        return User.findOne({ where: { email: value.trim() } }).then((user) => {
          if (!user) {
            return Promise.reject(
              "Пользователь с этим адресом электронной почты не зарегестрирован!"
            );
          }
          req.user = user;
        });
      }),
    body("password", "Введен не корректный пароль!")
      .trim()
      .isLength({ min: 5 })
      .withMessage("Введенный пароль слишком короткий")
      .matches(/^(?=.*[a-zа-яё])(?=.*[A-ZА-ЯЁ])(?=.*\d).*$/)
      .custom((value, { req }) => {
        // Проверяем пароль только если email прошел валидацию
        if (req.user) {
          return bcrypt.compare(value, req.user.password).then((doMatch) => {
            if (!doMatch) {
              return Promise.reject("Введен неверный пароль!");
            }
          });
        }
      }),
  ],
  authController.postLogin
);
router.post("/logout", csrfProtection, authController.postLogout);

router.get("/register", csrfProtection, authController.getRegisterUser);
router.post(
  "/register",
  csrfProtection,
  [
    check("email")
      .isEmail()
      .withMessage("Пожалуйста введите правильный адрес электронной почты")
      .normalizeEmail()
      .custom((value, { req }) => {
        // if (value === "test@test.com") {
        //   throw new Error("Это адрес электронной почты запрещен");
        // }
        // return true;
        return User.findOne({ where: { email: value } }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject(
              "Пользователь с этим адресом электронной почты уже зарегистрирован!"
            );
          }
        });
      }),
    body(
      "username",
      "Имя пользователя должно содержать 3-20 символов и может включать буквы, цифры, дефис и подчеркивание"
    )
      .trim()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zа-яA-ZА-Я0-9_-]+$/)
      .not()
      .matches(/^[0-9]/)
      .withMessage("Имя пользователя не должно начинаться с цифры")
      .not()
      .matches(/^[-_]|[-_]$/)
      .withMessage(
        "Имя пользователя не должно начинаться или заканчиваться дефисом или подчеркиванием"
      )
      .not()
      .matches(/^[0-9]+$/)
      .withMessage("Имя пользователя не должно состоять только из цифр"),
    body(
      "password",
      "Пожалуйста введите пароль состоящий из букв и цифр, длинной не менее 5 символов, с заглавными и строчными буквами"
    )
      .trim()
      .isLength({ min: 5 })
      .matches(/^(?=.*[a-zа-яё])(?=.*[A-ZА-ЯЁ])(?=.*\d)(?!.*\s).*$/)
      .withMessage(
        "Пароль должен содержать заглавные буквы, строчные буквы и цифры"
      ),
    body("repeatPass").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Введенные пароли не совпадают!");
      }
      return true;
    }),
  ],
  authController.postRegisterUser
);

router.get("/reset", csrfProtection, authController.getReset);
router.post("/reset", authController.postReset);
router.get("/reset/:token", csrfProtection, authController.getNewPassword);
router.post("/new-password", csrfProtection, authController.postNewPassword);

module.exports = router;
