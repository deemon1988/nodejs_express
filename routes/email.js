const express = require('express')
const isAuth = require('../middleware/is-auth')
const isAdmin = require('../middleware/is-admin')
const router = express.Router()
const { test } = require('../check-emails')
const YandexEmailChecker = require('../util/emailChecker')

router.get('/check-email', isAuth, isAdmin, async (req, res, next) => {
    const threadId = req.query.threadId
    const checker = new YandexEmailChecker();
    const result = await checker.checkEmails();
    if (threadId) {
        res.redirect(`/admin/messages/${threadId}`)
    } else {
        req.flash('success', result.message)
        res.redirect('/admin/messages')
    }

})

module.exports = router

