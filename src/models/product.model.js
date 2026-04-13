const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true, unique: true, trim: true },
    categorySlug: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    commission: { type: String, required: true, trim: true },
    logo: { type: String, required: true, trim: true },
    benefits: [{ type: String, trim: true }],
    howToEarn: [{ type: String, trim: true }],
    terms: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
