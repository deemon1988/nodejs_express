const authController = require('../controllers/auth')

const express = require("express");

const router = express.Router();

router.get('/singin', authController.getLogin)
router.post('/singin', authController.postLogin)
router.post('/singout', authController.postLogout)

router.get('/register', authController.getRegisterUser)
router.post('/register', authController.postRegisterUser)

module.exports = router

