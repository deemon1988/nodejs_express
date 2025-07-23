const authController = require('../controllers/auth')
const express = require("express");
const router = express.Router();
const csrf = require('csurf');
const csrfProtection = csrf();

router.get('/singin', csrfProtection, authController.getLogin)
router.post('/singin', authController.postLogin)
router.post('/logout', authController.postLogout)

router.get('/register', csrfProtection, authController.getRegisterUser)
router.post('/register', authController.postRegisterUser)

module.exports = router

