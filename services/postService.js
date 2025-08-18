const { fn, literal, Op } = require("sequelize");
const Post = require("../models/post");
const Comment = require("../models/comment");
const Category = require("../models/category");
const User = require("../models/user");
const sequelize = require("../util/database"); // замените на ваш путь
const { Sequelize } = require("sequelize");

exports.getPostsWithLikedUsersQuery = (userId, categoryId) => {
  const whereCondition = {};
  if (categoryId) {
    whereCondition.categoryId = categoryId;
  }
  return Post.findAndCountAll({
    where: whereCondition,
    attributes: {
      include: [[fn("COUNT", literal(' "comments"."id"')), "commentsCount"]],
    },
    include: [
      {
        model: Comment,
        as: "comments",
        attributes: [],
        required: false,
      },
      {
        model: User,
        as: "likedUsers",
        attributes: ["id"], // нужно, чтобы мы могли проверить id
        through: { attributes: [] },
        where: { id: userId }, //userId ? { id: userId } : undefined,
        required: false,
      },
      {
        model: Category,
        as: "category",
      },
    ],
    group: ["post.id", "category.id", "likedUsers.id"],
    order: [
      ["likes", "DESC"],
      [literal('"commentsCount"'), "DESC"],
    ],
  });
};

exports.getTopPostsByCataegoryQuery = () => {
  return sequelize.query(
    `
  WITH ranked_posts AS (
    SELECT
      "post"."id",
      "post"."title",
      "post"."likes",
      "post"."categoryId",
      "post"."image",
      "post"."createdAt",
      "category"."name" AS "categoryName",
      "category"."image" AS "categoryImage",
      COUNT("comments"."id") AS "commentsCount",
      ROW_NUMBER() OVER (
        PARTITION BY "post"."categoryId"
        ORDER BY "post"."likes" DESC, COUNT("comments"."id") DESC
      ) AS "rank"
    FROM "posts" AS "post"
    LEFT JOIN "comments" AS "comments" ON "post"."id" = "comments"."postId"
    LEFT JOIN "categories" AS "category" ON "post"."categoryId" = "category"."id"
    GROUP BY "post"."id", "post"."categoryId", "category"."id"
  )
  SELECT * FROM ranked_posts
  WHERE "rank" = 1
  ORDER BY "likes" DESC, "commentsCount" DESC;
    `,
    { type: Sequelize.QueryTypes.SELECT }
  );
};

exports.getRandomPostsFromTop5Query = () => {
  return sequelize.query(
    `
  WITH ranked_posts AS (
    SELECT
      "post"."id",
      "post"."title",
      "post"."likes",
      "post"."categoryId",
      "post"."image",
      "post"."createdAt",
      "category"."name" AS "categoryName",
      "category"."image" AS "categoryImage",
      COUNT("comments"."id") AS "commentsCount",
      ROW_NUMBER() OVER (
        PARTITION BY "post"."categoryId"
        ORDER BY "post"."likes" DESC, COUNT("comments"."id") DESC
      ) AS "rank"
    FROM "posts" AS "post"
    LEFT JOIN "comments" AS "comments" ON "post"."id" = "comments"."postId"
    LEFT JOIN "categories" AS "category" ON "post"."categoryId" = "category"."id"
    GROUP BY "post"."id", "post"."categoryId", "category"."id"
  )
  SELECT * FROM ranked_posts
  WHERE "rank" <= 5
  ORDER BY "likes" DESC, "commentsCount" DESC;
    `,
    { type: Sequelize.QueryTypes.SELECT }
  );
};

exports.getTopPosts = () => {
  return Post.findAll({
    include: [
      {
        model: Category,
        as: "category",
      },
    ],
    order: [["likes", "DESC"]],
    limit: 5,
  });
};

exports.getTopCreatedAtPosts = () => {
  return sequelize.query(
    `
  WITH ranked_posts AS (
    SELECT
      "post"."id",
      "post"."title",
      "post"."likes",
      "post"."categoryId",
      "post"."image",
      "post"."createdAt",
      "category"."name" AS "categoryName",
      "category"."image" AS "categoryImage",
      COUNT("comments"."id") AS "commentsCount",
      ROW_NUMBER() OVER (
        PARTITION BY "post"."categoryId"
        ORDER BY "post"."createdAt" DESC
      ) AS "rank"
    FROM "posts" AS "post"
    LEFT JOIN "comments" AS "comments" ON "post"."id" = "comments"."postId"
    LEFT JOIN "categories" AS "category" ON "post"."categoryId" = "category"."id"
    GROUP BY "post"."id", "category"."id"
  )
  SELECT * FROM ranked_posts
  WHERE "rank" = 1
  ORDER BY "createdAt" ASC;
    `,
    { type: Sequelize.QueryTypes.SELECT }
  );
};

exports.getPopularPostsLastMonth = async (limit) => {
  try {
    const endDate = new Date()
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    const lastMounthPosts = await Post.findAll({
      where: {
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      order: [['likes', 'DESC']],
      limit: limit,
    });
    return lastMounthPosts;
  } catch (error) {
    console.log("Ошибка получения постов за последний месяц: ", error);
    return [];
  }
};

exports.getTopPostPerCategory = async (filterYear = null) => {
  try {
    let whereCondition = {}
    const topPosts = []
    const categories = await Category.findAll({
      attributes: ['id']
    })
    for (let category of categories) {
      whereCondition.categoryId = category.id
      if (filterYear) {
        whereCondition.createdAt = {
          [Op.between]: [
            new Date(filterYear, 0, 1),
            new Date(filterYear, 11, 31, 23, 59, 59)
          ]
        }
      }
      const topPost = await Post.findOne({
        where: whereCondition,
        order: [['likes', 'DESC']], // Сортируем по количеству лайков
        include: [{
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'image']
        }]
      })
      if (topPost) {
        topPosts.push(topPost);
      }
    }

    return topPosts
  } catch (error) {
    console.error("Ошибка получения популярных постов в каждой категории: ", error.message)
    return []
  }
}

exports.getLatestPostPerCategory = async () => {
  const result = await sequelize.query(`
    SELECT DISTINCT ON ("categoryId") 
      p.*,
      c."name" as "categoryName",
      c."image" as "categoryImage"

    FROM "posts" p
    LEFT JOIN "categories" c ON p."categoryId" = c."id"
    WHERE p."isPublished" = true
    ORDER BY "categoryId", "createdAt" DESC
  `, {
    type: Sequelize.QueryTypes.SELECT
  });

  return result;
};

exports.getLatestPostPerCategoryAdmin = async () => {
  const result = await sequelize.query(`
    SELECT DISTINCT ON ("categoryId") 
      p.*,
      c."name" as "categoryName",
      c."image" as "categoryImage"

    FROM "posts" p
    LEFT JOIN "categories" c ON p."categoryId" = c."id"
    ORDER BY "categoryId", "createdAt" DESC
  `, {
    type: Sequelize.QueryTypes.SELECT
  });

  return result;
};

exports.getRandomPostInCategory = async (categoryId, limit) => {
  return await Post.findAll({
    where: { categoryId: categoryId },
    include: [{
      model: Category,
      as: 'category'
    }
    ],
    order: sequelize.random(),
    limit: limit
  })
};

exports.getPopularPostInCategory = async (categoryId, limit) => {
  return await Post.findAll({
    where: { categoryId: categoryId },
    order: [['likes', 'DESC']],
    limit: limit
  })
};

exports.getMostPopularPosts = async (quantity) => {
  return await Post.findAll({
    include: [
      {
        model: Category,
        as: "category",
      },
    ],
    order: [
      ["likes", "DESC"],
    ],
    limit: quantity
  });
}
