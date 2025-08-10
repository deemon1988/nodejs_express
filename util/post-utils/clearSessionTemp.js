function clearSessionImages(req) {
    req.session.tempImage = null;
    req.session.tempCover = null;
    req.session.tempGallery = null;
}

module.exports = { clearSessionImages }