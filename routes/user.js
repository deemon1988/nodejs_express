const express = require('express')
const router = express.Router()
const profileController = require('../controllers/profile')

const csrf = require('csurf');
const csrfProtection = csrf();

const upload = require("../config/multerConfig");
const isAuth = require('../middleware/is-auth')


router.get('/user/profile', csrfProtection, isAuth, profileController.getProfile)
router.get('/user/edit-profile', csrfProtection, isAuth, profileController.getEditProfile)
router.post('/user/edit-profile', isAuth, upload.single('avatar'), profileController.postEditProfile)




module.exports = router