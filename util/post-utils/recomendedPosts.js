const { Op, Sequelize } = require("sequelize")
const Post = require("../../models/post")

async function getRecomendedPosts(viewHistory, quantity) {

    const allPostsWithoutViewed = await Post.findAll({
        where: {
            id: { [Op.notIn]: viewHistory }
        },
        order: [Sequelize.literal('RANDOM()')],
        limit: quantity
    })

    return allPostsWithoutViewed
}

module.exports = { getRecomendedPosts }