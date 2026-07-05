const express = require("express");
const { body } = require("express-validator");

const User = require("../models/user");
const convController = require("../controllers/conversation");
const isAuth = require("../middleware/is-auth");
const router = express.Router();

router.get("/conversations", isAuth, convController.getConversations);

router.get(
  "/conversation/:conversationId",
  isAuth,
  convController.getConversation
);

router.post("/conversations/", isAuth, convController.createConversation);

router.delete(
  "/conversation/:conversationId",
  isAuth,
  convController.deleteConversation
);

router.put(
  "/conversation/:conversationId",
  isAuth,
  convController.updateConversation
);

module.exports = router;
