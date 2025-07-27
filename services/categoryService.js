const { fn, col } = require("sequelize");
const Category = require("../models/category");
const Post = require("../models/post");

async function getAllCategoriesWithPosts() {
  try {
    const categories = await Category.findAll({
      attributes: {
        include: [
          "id",
          "name",
          "image",
          [fn("COUNT", col("posts.id")), "postCount"],
          [fn("MAX", col("posts.createdAt")), "latestPostDate"],
        ],
      },
      include: [
        {
          model: Post,
          as: "posts", // укажите ассоциацию, как у вас
          attributes: [], // не нужны данные постов
        },
      ],
      group: ["category.id"],
      // order: [[literal("postCount"), "DESC"]],
    });
    return categories;
  } catch (error) {
    console.log("Ошибка при получении категорий:", error);
  }
}

module.exports = { getAllCategoriesWithPosts };
