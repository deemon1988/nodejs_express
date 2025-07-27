const { Op } = require("sequelize");
const Post = require("../models/post");
const Category = require("../models/category");

async function getRecommendedPosts(viewHistory, page = 1, limit = 10) {
  try {
    if (!viewHistory || viewHistory.length === 0) {
      return { posts: [], total: 0, page, limit, totalPages: 0 };
    }
    const viewedPosts = await Promise.all(
      viewHistory.map((postId) =>
        Post.findByPk(postId, { attributes: ["id", "categoryId"] })
      )
    );

    // Фильтруем, на случай если некоторые ID не найдены
    const validViewedPosts = viewedPosts.filter((p) => p !== null);
    if (validViewedPosts.length === 0) {
      return { posts: [], total: 0, page, limit, totalPages: 0 };
    }

    // 2. Извлекаем уникальные categoryId
    const categoryIds = [...new Set(validViewedPosts.map((p) => p.categoryId))];

    // 3. Общее количество подходящих постов (для пагинации)
    const total = await Post.count({
      where: {
        categoryId: categoryIds,
        id: { [Op.notIn]: viewHistory },
      },
    });

    if (total === 0) {
      return { posts: [], total, page, limit, totalPages: 0 };
    }

    // 4. Вычисляем offset для пагинации
    const offset = (page - 1) * limit;

    // 5. Получаем рекомендованные посты 
    const recommendedPosts = await Post.findAll({
      where: {
        categoryId: categoryIds,
        id: { [Op.notIn]: viewHistory },
      },
       include: [
            {
                model: Category,
                as: 'category'
            }
        ],
      limit,
      offset,
      order: [["createdAt", "DESC"]], // PostgreSQL
      // Сортировать все записи, по дате
    });

    // 6. Вычисляем общее количество страниц
    const totalPages = Math.ceil(total / limit);

    return {
      posts: recommendedPosts,
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



module.exports = { getRecommendedPosts };
