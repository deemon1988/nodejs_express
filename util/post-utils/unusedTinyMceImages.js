const { Op } = require("sequelize")
const Image = require("../../models/image")
const { deleteFiles } = require("../fileUtils")

async function updateTinyMceImages(postId, usedImages) {
    try {
        await Image.update({
            entityId: postId,
            entityType: 'post'
        },
            {
                where: {
                    path: { [Op.in]: usedImages }
                }
            }
        )
    } catch (error) {
        console.log(error)
        const err = new Error("Ошибка при обновлении изображений в БД", error.message)
        next(err)
    }

}

async function deleteUnusedTinyMceImages(oldTinymceImages, usedImages) {
    try {
        const deletedImages = oldTinymceImages
            .filter(image => !usedImages.includes(image.path))
            .map(image => image.path)

        await Image.destroy({
            where: {
                [Op.or]: [
                    { path: deletedImages },         // условие 1
                    { entityId: null },                // условие 2
                    { entityType: null },
                ]
            }
        })
        deleteFiles(deletedImages)
    } catch (error) {
        console.log(error)
        const err = new Error("Ошибка при обновлении изображений в БД", error.message)
        next(err)
    }

}

module.exports = { updateTinyMceImages, deleteUnusedTinyMceImages }