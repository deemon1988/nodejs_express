const User = require("../models/user");

exports.getLogin = (req, res, err) => {
  res.render("user/singin", {
    pageTitle: "Авторизация",
  });
};

exports.postLogin = (req, res, err) => {
  User.findByPk(1)
    .then((user) => {
      if (!user) {
        return User.create({
          username: "User1",
          email: "user@email.com",
          password: "123",
          isAdmin: true,
        });
      }
      return user;
    })
    .then(async (user) => {
      req.session.isLoggedIn = true;
      req.session.user = user;
      const userProfile = await user.getProfile();
      if (!userProfile)
        return user.createProfile({
          firstname: "Name",
          role: "user",
          avatar: "/images/profile-avatar.png",
        });
      return userProfile;
    })
    .then((profile) => {
      res.redirect("/");
    })
    .catch((err) => console.log(err));
};

exports.postLogout = (req, res, err) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};
