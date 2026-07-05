const jwt = require("jsonwebtoken");

module.exports = (req, _res, next) => {
  const authHeader = req.get("Authorization");
  console.log(`[AUTH] ${req.method} ${req.originalUrl} | Authorization: ${authHeader}`);
  if (!authHeader) {
    const error = new Error("Not authenticated.");
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(" ")[1];
  console.log(token);
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    err.statusCode = err.name === "TokenExpiredError" ? 401 : 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error("Not authenticated.");
    error.statusCode = 401;
    throw error;
  }
  req.userId = decodedToken.userId;
  req.userRole = decodedToken.role || 'user';
  next();
};
