exports.get404 = (req, res, next) => {
  res.status(404).render("404", { pageTitle: "Страница не найдена", path: '/404' });
}

exports.get500 = (error, req, res, next) => {
  res.status(500).render("500", { pageTitle: "Ошибка!", path: '/500' });
}