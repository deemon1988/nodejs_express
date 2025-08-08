const Sequelize = require('sequelize')
const sequelize = require('../util/database')

const Image = sequelize.define('image', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    filename: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    path: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    size: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    mimetype: {
        type: Sequelize.STRING,
        allowNull: false,
    },
     // ID связанной сущности
    entityId: {
        type: Sequelize.INTEGER,
        allowNull: true,
    },
    // Тип связанной сущности
    entityType: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
            isIn: [['post', 'guide']] // ограничиваем допустимые значения
        }
    }
})

// Методы для удобной работы с полиморфными связями
Image.prototype.getEntity = async function() {
    switch(this.entityType) {
        case 'post':
            const Post = require('./post')
            return await Post.findByPk(this.entityId)
        case 'guide':
            const Guide = require('./guide')
            return await Guide.findByPk(this.entityId)
        default:
            return null
    }
}

// Статические методы для создания изображений
Image.createForPost = function(postId, imageData) {
    return Image.create({
        ...imageData,
        entityId: postId,
        entityType: 'post'
    })
}

Image.createForGuide = function(guideId, imageData) {
    return Image.create({
        ...imageData,
        entityId: guideId,
        entityType: 'guide'
    })
}

// Универсальный метод для удаления по типу сущности
Image.deleteByEntity = async function(entityId, entityType) {
    return await Image.destroy({
        where: {
            entityId: entityId,
            entityType: entityType
        }
    });
};

module.exports = Image