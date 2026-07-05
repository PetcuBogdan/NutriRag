const express = require("express");
const { body } = require("express-validator");
const isAuth = require("../middleware/is-auth");
const User = require("../models/user");
const messController = require("../controllers/message");

const router = express.Router();

router.get("/:conversationId/messages", isAuth, messController.getMessages);

router.post("/:conversationId/", isAuth, messController.postMessage);

module.exports = router;
