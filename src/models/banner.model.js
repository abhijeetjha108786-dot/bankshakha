const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    imageUrl: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 1, min: 0, max: 9999 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);
