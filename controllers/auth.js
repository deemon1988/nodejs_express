exports.getLogin = (req, res, err) => {
    // const isLoggedIn = req.get('Cookie').split("=")[1]
    console.log(req.session.isLoggedIn)
  res.render("user/singin", {
    pageTitle: "Авторизация",
    // isAuthenticated: isLoggedIn,
  });
};

exports.postLogin = (req, res, err) => {
  req.session.isLoggedIn = true
  res.redirect("/");
};
