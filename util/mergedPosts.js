const { getAllPosts } = require("./allPostsPerPage");
const { getRecommendedPosts } = require("./recomendedPosts");

async function getMergedPosts(viewHistory, page = 1, limit = 10) {
  try {
    // 1. Получаем рекомендованные посты (с пагинацией, но можем взять все или порцию)
    const recommendedResult = await getRecommendedPosts(viewHistory, page, 5); // буфер, но не больше 50
    const recommendedPosts = recommendedResult.posts;

    // 2. Получаем все посты (с пагинацией)
    const allPostsResult = await getAllPosts(page, limit);
    const allPosts = allPostsResult.posts;

    // 3. Извлекаем ID рекомендованных постов для фильтрации
    const recommendedIds = new Set(recommendedPosts.map(p => p.id));

    // 4. Фильтруем все посты — убираем те, что уже в рекомендациях
    const filteredAllPosts = allPosts.filter(p => !recommendedIds.has(p.id));

    // 5. Объединяем: сначала рекомендации, потом остальные
    const mergedPosts = [...recommendedPosts, ...filteredAllPosts];

    // 6. Убираем дубликаты (на всякий случай, если где-то просочились)
    const seen = new Set();
    const uniqueMergedPosts = mergedPosts.filter(post => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });

    // 7. Общее количество *уникальных* постов в системе
    //    Это: все посты в БД (уже есть в getAllPosts.total)
    const total = allPostsResult.total; // это и есть общее число постов

    // 8. Общее число страниц — такое же, как у `getAllPosts`, потому что мы не добавляем новых
    const totalPages = Math.ceil(total / limit);

    // 9. Но мы показываем только `limit` постов за раз
    // const start = (page - 1) * limit;
    // const paginatedPosts = uniqueMergedPosts.slice(start, start + limit);

    return {
      posts: uniqueMergedPosts,
      total,
      page,
      limit,
      totalPages,
      // Опционально: сколько постов из рекомендаций попало на этой странице
      // recommendedCount: recommendedPosts.filter(p => paginatedPosts.some(pp => pp.id === p.id)).length
    };
  } catch (error) {
    console.error('Error merging posts:', error);
    throw error;
  }
}

module.exports = { getMergedPosts }