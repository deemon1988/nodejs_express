const Category = require("../models/category");
const Post = require("../models/post");

async function getAllPosts() {
  try {
    const posts = await Post.findAll({
      include: [
        {
          model: Category,
          as: "category",
        },
      ],
    });
    return posts;
  } catch (error) {
    console.log(error);
  }
}

module.exports = {getAllPosts}