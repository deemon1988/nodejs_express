
const getContentImages = (postContent) => {
    // Извлекаем все пути изображений из content
    const imgSrcRegex = /<img[^>]+src="([^">]+)"/g;
    const usedImages = [];
    let match;
    while ((match = imgSrcRegex.exec(postContent))) {
        usedImages.push(match[1]); // например, /images/posts/gallery/123.jpg
    }
    return usedImages
}

module.exports = { getContentImages }