const mongoose = require("mongoose");

const supportSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add the contact name"],
    },
    email: {
      type: String,
      required: [true, "Please add the contact email address"],
    },
    subject: {
      type: String,
      required: [true, "Please add the subject"],
    },
    message: {
      type: String,
      required: [true, "Please add the message content"],
    },
    user_id: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Support", supportSchema);
