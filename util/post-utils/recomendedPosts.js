const { getRandomPosts } = require("../shuffle")

function getRecomendedPosts(postsList, viewHistory, quantity) {
    const copyPostsList = [...postsList]
    const recomendedPosts = copyPostsList.filter(post => !viewHistory.includes(post.id))
    return getRandomPosts(recomendedPosts, quantity)
}

module.exports = { getRecomendedPosts }