const express = require('express')

const router = express.Router()

const usersController = require('../controllers/users')
const profileController = require('../controllers/profile')

router.get('/singin', (req, res, err) => {
    res.render('user/singin', {
        pageTitle: 'Авторизация'
    })
})

router.get('/register', (req, res, err) => {
    res.render('user/register', {
        pageTitle: 'Регистрация'
    })
})

router.post('/register', usersController.postAddUser)

router.get('/user/profile', (req, res, err) => {
    res.render('user/profile', {
        pageTitle: 'Профиль',
        path: '/user/profile'
    })
})

router.get('/user/user-comments', profileController.getComments)

module.exports = router