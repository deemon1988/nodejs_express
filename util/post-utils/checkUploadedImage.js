function checkImageFormat(req, errors) {
    if (req.imageUploadAttempted && !req.files?.image) {
        errors.push({
            msg: 'Не поддерживаемый формат изображения. Разрешены только JPG, JPEG, PNG',
            param: 'image',
            location: 'body'
        });
    }

    if (req.coverUploadAttempted && !req.files?.cover) {
        errors.push({
            msg: 'Не поддерживаемый формат изображения. Разрешены только JPG, JPEG, PNG',
            param: 'cover',
            location: 'body'
        });
    }

     // Проверка галереи
    if (req.galleryUploadAttempted) {
        // Проверяем, были ли успешно загружены какие-либо файлы галереи
        const uploadedGalleryFiles = req.files?.gallery || [];
        
        // Если попытка загрузки была, но нет успешно загруженных файлов
        if (uploadedGalleryFiles.length === 0 && req.galleryFilesAttempted.length > 0) {
            errors.push({
                msg: 'Не поддерживаемый формат изображения в галерее. Разрешены только JPG, JPEG, PNG',
                param: 'gallery',
                location: 'body'
            });
        }
        // Если загружены только некоторые файлы, можно добавить более детальную проверку
        else if (uploadedGalleryFiles.length > 0 && uploadedGalleryFiles.length < req.galleryFilesAttempted.length) {
            // Можно добавить информацию о том, какие именно файлы имеют неправильный формат
            const successfulFiles = uploadedGalleryFiles.map(file => file.originalname);
            const failedFiles = req.galleryFilesAttempted.filter(name => !successfulFiles.includes(name));
            
            if (failedFiles.length > 0) {
                errors.push({
                    msg: `Некоторые файлы в галерее имеют неподдерживаемый формат: ${failedFiles.join(', ')}. Разрешены только JPG, JPEG, PNG`,
                    param: 'gallery',
                    location: 'body'
                });
            }
        }
    }
}

module.exports = { checkImageFormat }