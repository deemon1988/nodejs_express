const { deleteFile, deleteFiles } = require("./fileUtils");

function getFileFromRequest(req, fieldName, basePath) {
  // Проверяем, не был ли файл помечен как удаленный
  const fieldDeleted = req.body[`${fieldName}Deleted`] === 'true';

  if (fieldDeleted) {
    return null;
  }

  // Проверяем новый загруженный файл
  if (req.files && req.files[fieldName] && req.files[fieldName][0]) {
    return `${basePath}/` + req.files[fieldName][0].filename;
  }

  // Проверяем файл из сессии
  const sessionKey = `temp${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
  if (req.session && req.session[sessionKey]) {
    return req.session[sessionKey];
  }

  return null;
}

function getFilesFromRequest(req, fieldName, basePath) {
  // Проверяем, не был ли файл помечен как удаленный
  const fieldDeleted = req.body[`${fieldName}Deleted`] === 'true';
  if (fieldDeleted) {
    return null;
  }

  // Проверяем новый загруженный файл
  if (req.files && req.files[fieldName] && req.files[fieldName].length > 0) {
    return req.files[fieldName].map(file => `${basePath}/` + file.filename) 
  }

  // Проверяем файл из сессии
  const sessionKey = `temp${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
  if (req.session && req.session[sessionKey]) {
    return req.session[sessionKey];
  }
}

function checkAndSaveFileFromRequest(req, basePath) {
  // Обработка изображения
  const imageDeleted = req.body.imageDeleted === 'true';

  if (imageDeleted) {
    if (req.session.tempImage) {
      deleteFile(req.session.tempImage);
      req.session.tempImage = null;
    }
  } else if (req.files && req.files["image"]) {
    if (req.session.tempImage) {
      deleteFile(req.session.tempImage);
    }
    req.session.tempImage = `${basePath}/` + req.files["image"][0].filename;
  }

  // Обработка обложки
  const coverDeleted = req.body.coverDeleted === 'true';
  if (coverDeleted) {
    if (req.session.tempCover) {
      deleteFile(req.session.tempCover);
      req.session.tempCover = null;
    }

  } else if (req.files && req.files["cover"]) {
    if (req.session.tempCover) {
      deleteFile(req.session.tempCover);
    }
    req.session.tempCover = `${basePath}/cover/` + req.files["cover"][0].filename;
  }

  // Обработка галлереи
  const galleryDeleted = req.body.galleryDeleted === 'true';
  if (galleryDeleted) {
    if (req.session.tempGallery) {
      deleteFiles(req.session.tempGallery);
      req.session.tempGallery = null;
    }

  } else if (req.files && req.files["gallery"]) {
    if (req.session.tempGallery) {
      deleteFiles(req.session.tempGallery);
    }
    req.session.tempGallery = req.files["gallery"].map(file => `${basePath}/gallery/` + file.filename);
  }
}

module.exports = { getFileFromRequest, checkAndSaveFileFromRequest, getFilesFromRequest }

