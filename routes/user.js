const express = require('express')
const router = express.Router()
const profileController = require('../controllers/profile')
const upload = require("../config/multerConfig");
const isAuth = require('../middleware/is-auth')



router.get('/user/profile', isAuth, profileController.getProfile)
router.get('/user/edit-profile', isAuth, profileController.getEditProfile)
router.post('/user/edit-profile', upload.single('avatar'), isAuth, profileController.postEditProfile)

router.get('/user/user-comments', isAuth, profileController.getComments)



module.exports = router