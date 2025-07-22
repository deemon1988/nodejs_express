module.exports = (req, res, next) => {
  if (!req.user && req.session) {
    req.session.destroy();
    return res.status(401).redirect("/");
  }
  next();
};
