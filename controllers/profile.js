const { formatDate, formatDateOnly } = require("../util/date");
const Post = require("../models/post");
const User = require("../models/user");
const UserActivity = require("../models/user-activity");
const Profile = require("../models/profile");

exports.getComments = (req, res, next) => {
  req.user
    .getProfile()
    .then((profile) => {
      return profile
        .getComments({ include: [{ model: Post, as: "post" }] })
        .then((comments) => {
          res.render("user/user-comments", {
            pageTitle: "Комментарии пользователя",
            path: "/user/user-comments",
            comments: comments,
            formatDate: formatDate,
            // isAuthenticated: req.session.isLoggedIn
          });
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
};

exports.getProfile = (req, res, next) => {
  let fetchedComments;
  let userProfile;
  let lastPost;
  req.user
    .getProfile({
      include: [
        { model: User, as: "user" },
        {
          model: UserActivity,
          as: "useractivities",
          order: [["createdAt", "DESC"]],
          limit: 20,
        },
      ],
    })
    .then((profile) => {
      userProfile = profile;
      return profile.getComments({ include: [{ model: Post, as: "post" }] });
    })
    .then((comments) => {
      fetchedComments = comments;
      return req.user.getPosts();
    })
    .then((posts) => {
      if (posts.length > 0) {
        lastPost = posts.reduce((r, o) => (o.createdAt < r.createdAt ? o : r));
      }

      res.render("user/profile", {
        pageTitle: "Профиль",
        path: "/user/profile",
        comments: fetchedComments,
        lastPost: lastPost,
        profile: userProfile,
        formatDate: formatDateOnly,
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch((err) => console.log(err));
};

exports.getEditProfile = (req, res, next) => {
  const userId = req.session.userId;
  Profile.findByPk(userId)
    .then((profile) => {
      res.render("user/edit-profile", {
        pageTitle: "Редактировать профиль",
        path: "/user/profile",
        profile: profile,
        user: req.user,
        formatDate: formatDate,
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch((err) => console.log(err));
};

exports.postEditProfile = (req, res, next) => {
  console.log(req.body);
  const userId = req.user.id;
  const profileId = req.body.profileId;
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const avatar = req.file
    ? "/images/user/" + req.file.filename
    : "/images/profile-avatar.jpg";

  Profile.update(
    { firstname: firstname, lastname: lastname, avatar: avatar },
    { where: { id: profileId } }
  )
    .then((result) => {
      return Profile.findByPk(profileId);
    })
    .then((profile) => {
      res.redirect("/user/profile");
    })
    .catch((err) => console.log(err));
};

// UserActivity.create({
//   userId: userId,
//   actionType: 'profile_updated',
//   targetType: 'profile',
//   targetId: profile.id,
//   description: 'Обновлён профиль'
// });
