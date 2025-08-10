const { deleteFile } = require("../fileUtils")

// function deleteOldGallery(oldGallery, updatedGallery) {
//     if (!oldGallery) return
//     const oldGalleryPaths = oldGallery.filter(image => !updatedGallery.includes(image))
//     deleteFiles(oldGalleryPaths)
// }

function deleteOldCover(oldCover, updatedCover) {
    if (!oldCover) return
    if (oldCover !== updatedCover) deleteFile(oldCover)
}

function deleteOldImage(oldImage, updatedImage) {
    if (!oldImage) return
    if (oldImage !== updatedImage) deleteFile(oldImage)
}

module.exports = { deleteOldCover, deleteOldImage }