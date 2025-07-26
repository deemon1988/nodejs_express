const { Op } = require("sequelize");
const Post = require("../models/post");
const Category = require("../models/category");

async function getAllPosts(page = 1, limit = 10) {
  try {
    // 3. Общее количество постов (для пагинации)
    const total = await Post.count();

    if (total === 0) {
      return { posts: [], total, page, limit, totalPages: 0 };
    }

    // 6. Вычисляем общее количество страниц
    const totalPages = Math.ceil(total / limit);

    // 4. Вычисляем offset для пагинации
    const offset = (page - 1) * limit;

    // 5. Получаем порцию постов в по дате
    const batchOfPosts = await Post.findAll({
      include: [
        {
          model: Category,
          as: "category",
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]], // PostgreSQL
      // Сортировать все записи, в случайном порядке перед выбором: [Sequelize.literal('RANDOM()')]
    });

    return {
      posts: batchOfPosts,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    console.error("Error fetching recommended posts:", error);
    throw error;
  }
}

module.exports = { getAllPosts };
