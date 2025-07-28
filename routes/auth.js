const authController = require("../controllers/auth");
const express = require("express");
const router = express.Router();
const csrf = require("csurf");
const csrfProtection = csrf();
const { check, body } = require("express-validator");
const User = require("../models/user");

router.get("/singin", csrfProtection, authController.getLogin);
router.post("/singin", authController.postLogin);
router.post("/logout", authController.postLogout);

router.get("/register", csrfProtection, authController.getRegisterUser);
router.post(
  "/register",
  csrfProtection,
  [
    check("email")
      .isEmail()
      .withMessage("Пожалуйста введите правильный адрес электронной почты")
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
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .not()
      .matches(/^[-_]|[-_]$/)
      .withMessage(
        "Имя пользователя не должно начинаться или заканчиваться дефисом или подчеркиванием"
      ),
    body(
      "password",
      "Пожалуйста введите пароль состоящий из букв и цифр, длинной не менее 5 символов, с заглавными и строчными буквами"
    )
      .isLength({ min: 5 })
      .matches(/^(?=.*[a-zа-яё])(?=.*[A-ZА-ЯЁ])(?=.*\d).*$/)
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
