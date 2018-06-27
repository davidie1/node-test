/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
  if (!req.user) {
    return res.redirect('/login')
  }
  return res.redirect('/lessons')
};
