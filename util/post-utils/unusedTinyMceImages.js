const { Op } = require("sequelize")
const Image = require("../../models/image")
const { deleteFiles } = require("../fileUtils")

async function updateTinyMceImages(entityId, entityType, usedImages) {
    try {
        await Image.update({
            entityId: entityId,
            entityType: entityType
        },
            {
                where: {
                    path: { [Op.in]: usedImages }
                }
            }
        )
    } catch (error) {
        console.log(error)
        throw new Error("Ошибка при обновлении изображений в БД", error.message)
       
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