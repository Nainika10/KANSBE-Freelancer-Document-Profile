const mongoose = require("mongoose");
const textSchema = new mongoose.Schema({
  user: String,
  text: String,
  createdby: String,
  replyToText: String,
  replyToUser: String,
  readBy: { type: [String], default: [] }
}, {
  timestamps: true
});
const chatSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true },   // link chat to project
    texts: [textSchema],
    timestamp: { type: Date, default: Date.now }
  });
module.exports = mongoose.model("Chat", chatSchema);