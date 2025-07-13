exports.getComments = (req, res, next) => {
  req.user
    .getProfile()
    .then((profile) => {
      return profile
        .getComments()
        .then((comments) => {
          res.render("user/user-comments", {
            pageTitle: "Комментарии пользователя",
            path: "/user/user-comments",
            comments: comments,
          });
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
};
