const Message = require("../../../../models/message")

MESSAGES_PER_PAGE = 5
async function getAdminMessagesPagination(page) {
    const offset = (page - 1) * MESSAGES_PER_PAGE

    const {count, rows: messages} = await Message.findAndCountAll({
        order: [['createdAt', 'DESC']],
        offset: offset,
        limit: MESSAGES_PER_PAGE
    })

    const totalPages = Math.ceil(count / MESSAGES_PER_PAGE)
    return {
        messages: messages,
        currentPage: page,
        hasNextPage: (page * MESSAGES_PER_PAGE) < count,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: totalPages,
        totalPages: totalPages
    }
}

module.exports = { getAdminMessagesPagination }