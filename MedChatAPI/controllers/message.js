const { validationResult, ValidationError } = require("express-validator");
const Message = require("../models/message");
const Conversation = require("../models/conversation");
const User = require("../models/user");

exports.getMessages = (req, res, next) => {
  const conversationId = req.params.conversationId;

  Conversation.findById(conversationId)
    .then((conversation) => {
      if (!conversation) {
        const error = new Error("Could not find conversation.");
        error.statusCode = 404;
        throw error;
      }

      const messageIds = conversation.messages;
      console.log(messageIds);

      return Message.find({ _id: { $in: messageIds } });
    })
    .then((messages) => {
      if (!messages) {
        const error = new Error("Could not find messages.");
        error.statusCode = 404;
        throw error;
      }

      const messageTexts = messages.map((msg) => ({
        text: msg.text,
        sender_type: msg.sender_type,
      }));

      console.log(messageTexts);

      res.status(200).json({
        message: "Fetched messages successfully.",
        messages: messageTexts,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.postMessage = async (req, res, next) => {
  const conversationId = req.params.conversationId;
  const { text, sender_type } = req.body;
  console.log(conversationId);
  try {
    const message = new Message({
      text: text,
      sender: req.userId,
      sender_type: sender_type,
    });
    const savedMessage = await message.save();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const error = new Error("Conversation not found.");
      error.statusCode = 404;
      throw error;
    }

    conversation.messages.push(savedMessage._id);
    await conversation.save();

    res.status(201).json({
      message: "Message saved successfully!",
      savedMessage: savedMessage,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
