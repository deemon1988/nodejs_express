exports.getYandexDiskToken = (req) => {
  const token = req.session?.yandexDiskAccessToken;
  if (token && token.expireTime > Date.now()) {
    return token;
  } else {
    // Удаляем просроченный токен
    if (token) {
      delete req.session.yandexDiskAccessToken;
    }
    return null;
  }
};

