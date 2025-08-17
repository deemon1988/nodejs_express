const { Op } = require("sequelize");
const Post = require("../models/post");
const Category = require("../models/category");
const Comment = require("../models/comment");
const User = require("../models/user");

async function getMergedPosts(userId, viewHistory, page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;

    // Получаем все просмотренные посты с categoryId
    const viewedPostsRaw = viewHistory?.length
      ? await Post.findAll({
        where: {
          id: { [Op.in]: viewHistory }
        },
        attributes: ['id', 'categoryId']
      })
      : [];

    // Получаем список id всех категорий из истории просмотра
    const categoryIds = [...new Set(viewedPostsRaw.map(p => p.categoryId))];

    // Получаем рекомендуемые посты (не просмотренные)
    const recommendedPosts = await Post.findAll({
      where: {
        ...(categoryIds.length > 0 && { categoryId: categoryIds }),
        ...(viewHistory?.length && { id: { [Op.notIn]: viewHistory } }),
      },
      include: [
        {
          model: Category, as: 'category'
        },
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
          where: { id: userId },
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const recommendedPostsIds = recommendedPosts.map(p => p.id);

    // Получаем просмотренные посты
    const remainderPosts = await Post.findAll({
      where: {
        id: { [Op.notIn]: recommendedPostsIds }
      },
      include: [
        {
          model: Category, as: 'category'
        },
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
          where: { id: userId },
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    })


    // Объединяем: сначала рекомендуемые, потом просмотренные
    const allPosts = [...recommendedPosts, ...remainderPosts];

    const total = allPosts.length;
    const totalPages = Math.ceil(total / limit);

    // Пагинируем вручную
    const paginatedPosts = allPosts.slice(offset, offset + limit);

    return {
      posts: paginatedPosts,
      total,
      currentPage: page,
      hasNextPage: limit * page < total,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: totalPages,
      limit,
      totalPages,


    };
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
}


module.exports = { getMergedPosts }