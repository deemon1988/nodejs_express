
const { Sequelize, Op } = require('sequelize');

const Category = require("../../../../models/category")
const Comment = require("../../../../models/comment")
const Post = require("../../../../models/post")
const User = require("../../../../models/user")


const ITEMS_PER_PAGE = 5

async function postsPagination(pageNumber) {
    const page = +pageNumber || 1
    const offset = (page - 1) * ITEMS_PER_PAGE
    const { count, rows: posts } = await Post.findAndCountAll({
        include: [
            {
                model: Category,
                as: 'category'
            }
        ],
        order: [['createdAt', 'DESC']],
        offset: offset,
        limit: ITEMS_PER_PAGE
    })

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE)

    return {
        posts: posts,
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < count,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: totalPages,
        totalPages: totalPages,
    }
}



async function withLikePostsPagination(pageNumber, userId, categoryId, dateFilter) {
    const whereCondition = {};
    if (categoryId) {
        whereCondition.categoryId = categoryId;
    }
    // Добавляем фильтр по году
    if (dateFilter && dateFilter.year) {
        const year = parseInt(dateFilter.year);
        whereCondition.createdAt = {
            [Op.between]: [
                new Date(year, 0, 1),     // Начало года
                new Date(year, 11, 31, 23, 59, 59) // Конец года
            ]
        };
    }
    const page = +pageNumber || 1
    const offset = (page - 1) * ITEMS_PER_PAGE

    const total = await Post.count({
        where: whereCondition
    })
    const posts = await Post.findAll({
        where: whereCondition,
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
        order: [['createdAt', 'DESC']],
        offset: offset,
        limit: ITEMS_PER_PAGE
    });


    const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
    const postsIds = posts.map(post => post.id)
    const comments = await Comment.findAll({
        where: { postId: postsIds },
        attributes: [
            'postId',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['postId']
    })

    // Создаем карту количества комментариев
    const commentsCountMap = new Map();
    comments.forEach(comment => {
        commentsCountMap.set(comment.dataValues.postId, parseInt(comment.dataValues.count));
    });

    const postsWithComments = posts.map(post => ({
        ...post.toJSON(),
        commentsCount: commentsCountMap.get(post.id)
    }))
    return {
        posts: postsWithComments,
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < total,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: totalPages,
        totalPages: totalPages,
    }

}



module.exports = { postsPagination, withLikePostsPagination }