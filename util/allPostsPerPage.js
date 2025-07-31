const Post = require("../models/post");
const Category = require("../models/category");
const Comment = require("../models/comment");
const User = require("../models/user");

async function getAllPostsOnPage(userId, page = 1, limit = 10, postsIds) {
  try {
    // Определяем базовое условие WHERE
    const where = {};

    // Если переданы postsIds — добавляем условие
    if (postsIds && postsIds.length > 0) {
      where.id = postsIds;
    }
    // 3. Общее количество постов (для пагинации)
    const total = await Post.count({
      where: postsIds ? { id: postsIds } : {},
    });

    if (total === 0) {
      return { posts: [], total, page, limit, totalPages: 0 };
    }

    // 6. Вычисляем общее количество страниц
    const totalPages = Math.ceil(total / limit);

    // 4. Вычисляем offset для пагинации
    const offset = (page - 1) * limit;

    // 5. Получаем порцию постов в по дате
    const batchOfPosts = await Post.findAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
        },
        {
          model: Comment,
          as: "comments",
          // attributes: ['id', 'userId', 'postId'],
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

module.exports = { getAllPostsOnPage };
