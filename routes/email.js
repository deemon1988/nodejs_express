const express = require('express')
const isAuth = require('../middleware/is-auth')
const isAdmin = require('../middleware/is-admin')
const router = express.Router()
const { test } = require('../check-emails')
const YandexEmailChecker = require('../util/emailChecker')

router.get('/check-email', isAuth, isAdmin, async (req, res, next) => {

    const checker = new YandexEmailChecker();
    const result = await checker.checkEmails();
    req.flash('success', result.message)
    res.redirect('/admin/messages')
})

module.exports = router

