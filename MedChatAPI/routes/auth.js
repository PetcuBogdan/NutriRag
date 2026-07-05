const express = require("express");
const { body } = require("express-validator");

const User = require("../models/user");
const authController = require("../controllers/auth");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.put("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/me", isAuth, authController.getMe);

module.exports = router;
