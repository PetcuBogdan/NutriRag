const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'nutritionist'],
    default: 'user',
  },
  conversations: [{ type: Schema.Types.ObjectId, ref: "Conversation" }],
  metaAnalyses: [{ type: Schema.Types.ObjectId, ref: "MetaAnalysis" }],
  analyses: [{ type: Schema.Types.ObjectId, ref: "Analysis" }],
});

module.exports = mongoose.model("User", userSchema);
