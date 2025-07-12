const User = require('../models/user')

exports.postAddUser = (req, res, err) => {
    const username = req.body.username
    const email = req.body.email
    const password = req.body.password
    const repeatPass = req.body.repeatPass
    const user = new User(username, email, password, repeatPass)
    user.save()
    res.redirect('/')
}