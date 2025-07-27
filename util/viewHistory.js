const viewHistory = (req, postId) => {
  // Инициализируем историю просмотров, если её нет
  if (!req.session.viewHistory) {
    req.session.viewHistory = [];
    req.session.addedViewedPosts = []
    req.session.isEmptyPage = false
  }

  // Удаляем дубликат, если уже был просмотрен
  req.session.viewHistory = req.session.viewHistory.filter(
    (id) => id !== postId
  );

  // Добавляем в начало
  req.session.viewHistory.unshift(postId);

  // Ограничиваем до 10 последних
  req.session.viewHistory = req.session.viewHistory.slice(0, 10);

  // Лог для проверки
  console.log("История просмотров:", req.session.viewHistory);
};

module.exports = { viewHistory };
