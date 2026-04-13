const mongoose = require("mongoose");

const successStorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    quote: { type: String, required: true, trim: true },
    avatar: { type: String, required: true, trim: true, maxlength: 1 },
    color: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SuccessStory", successStorySchema);
