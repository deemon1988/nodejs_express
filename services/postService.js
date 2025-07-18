const { fn, literal } = require("sequelize");
const Post = require("../models/post");
const Comment = require("../models/comment");
const Category = require("../models/category");
const User = require("../models/user");

exports.getPostsQuery = (userId) => {
  return Post.findAndCountAll({
    attributes: {
      include: [[fn("COUNT", literal(' "comments"."id"')), "commentsCount"]],
    },
    include: [
      {
        model: Comment,
        as: "comments",
        attributes: [],
        required: false,
      },
      {
          model: User,
          as: "likedUsers",
          attributes: ["id"], // нужно, чтобы мы могли проверить id
          through: { attributes: [] },
          where: { id: userId }, //userId ? { id: userId } : undefined,
          required: false,
        },
      {
        model: Category,
        as: "category",
      },
    ],
    group: ["post.id", "category.id", "likedUsers.id"],
    order: [
      ["likes", "DESC"],
      [literal('"commentsCount"'), "DESC"],
    ],
  });
};
