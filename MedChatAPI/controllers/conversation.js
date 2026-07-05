const { validationResult, ValidationError } = require("express-validator");
const Conversation = require("../models/conversation");
const User = require("../models/user");

exports.getConversations = (req, res, next) => {
  const userId = req.userId;
  User.findById(userId)
    .populate("conversations")
    .then((conversations) => {
      console.log(conversations);
      res.status(200).json({
        message: "Fetched conversations successfully.",
        conversations: conversations,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createConversation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Enter a longer name");
    error.statusCode = 422;
    throw error;
  }
  const name = req.body.name;
  let creator;
  const conversation = new Conversation({
    name: name,
    creator: req.userId,
  });
  conversation
    .save()
    .then((_result) => {
      console.log("User id" + req.userId);
      return User.findById(req.userId);
    })
    .then((user) => {
      creator = user;
      user.conversations.push(conversation);
      return user.save();
    })
    .then((_result) => {
      res.status(201).json({
        message: "Conversation created successfully!",
        conversation: conversation,
        creator: { _id: creator._id, name: creator.name },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getConversation = (req, res, next) => {
  const conversationId = req.params.conversationId;
  Conversation.findById(conversationId).then((conversation) => {
    if (!conversation) {
      const error = new Error("Conversation does not exists!");
      error.statusCode = 404;
      throw error;
    }
    conversation
      .populate("messages")
      .then((messages) => {
        res.status(200).json({
          message: "Fetched messages successfully.",
          messages: messages,
        });
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  });
};

exports.deleteConversation = (req, res, next) => {
  const conversationId = req.params.conversationId;
  Conversation.findById(conversationId)
    .then((conversation) => {
      if (!conversation) {
        const error = new Error("Could not found this conversation!");
        error.statusCode = 404;
        throw error;
      }
      return Conversation.findByIdAndDelete(conversationId);
    })
    .then((_result) => {
      return User.findById(req.userId);
    })
    .then((user) => {
      user.conversations.pull(conversationId);
      return user.save();
    })
    .then((_result) => {
      res.status(200).json({ message: "Conversation deleted" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updateConversation = (req, res, next) => {
  const conversationId = req.params.conversationId;
  const name = req.body.name;
  Conversation.findById(conversationId)
    .then((conversation) => {
      if (!conversation) {
        const error = new Error("Conversation does not exists!");
        error.statusCode = 404;
        throw error;
      }
      conversation.name = name;
      return conversation.save();
    })
    .then((result) => {
      res.status(200).json({ message: "Conversation updated!", post: result });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
