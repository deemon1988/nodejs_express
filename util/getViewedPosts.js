const Category = require("../models/category");
const Post = require("../models/post");

async function getViewedPosts(viewHistory) {
  try {
    const viewedPosts = await Post.findAll({
      where: {
        id: viewHistory,
      },
      include: [
        {
          model: Category,
          as: "category",
        },
      ],
    });
    return viewedPosts;
  } catch (error) {
    console.log(error);
  }
}

module.exports = {getViewedPosts}