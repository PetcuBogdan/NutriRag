module.exports = (req, _res, next) => {
  if (req.userRole !== 'nutritionist') {
    const error = new Error('Access denied. Nutritionist role required.');
    error.statusCode = 403;
    throw error;
  }
  next();
};
