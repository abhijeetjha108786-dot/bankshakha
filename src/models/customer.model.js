const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    initial: { type: String, required: true, trim: true, maxlength: 1 },
    city: { type: String, trim: true, default: "" },
    referredProductCode: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
