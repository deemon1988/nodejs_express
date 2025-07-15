const express = require('express')

const router = express.Router()

const usersController = require('../controllers/users')
const profileController = require('../controllers/profile')

const upload = require("../config/multerConfig");



router.get('/register', (req, res, err) => {
    res.render('user/register', {
        pageTitle: 'Регистрация'
    })
})

router.post('/register', usersController.postAddUser)

router.get('/user/profile', profileController.getProfile)
router.get('/user/edit-profile', profileController.getEditProfile)
router.post('/user/edit-profile', upload.single('avatar'), profileController.postEditProfile)

router.get('/user/user-comments', profileController.getComments)



module.exports = router