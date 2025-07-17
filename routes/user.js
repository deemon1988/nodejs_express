const express = require('express')

const router = express.Router()

const profileController = require('../controllers/profile')

const upload = require("../config/multerConfig");





router.get('/user/profile', profileController.getProfile)
router.get('/user/edit-profile', profileController.getEditProfile)
router.post('/user/edit-profile', upload.single('avatar'), profileController.postEditProfile)

router.get('/user/user-comments', profileController.getComments)



module.exports = router