const mongoose = require("mongoose");

const earningSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    dateLabel: { type: String, required: true, trim: true },
    type: { type: String, enum: ["credit", "debit"], default: "credit" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved", index: true },
    source: { type: String, enum: ["manual", "referral", "withdrawal"], default: "manual" },
    productCode: { type: String, trim: true, default: "" },
    productName: { type: String, trim: true, default: "" },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, trim: true, default: "" },
    customerPhone: { type: String, trim: true, default: "" },
    referredAmount: { type: Number, min: 0 },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    paymentMethod: { type: String, enum: ["upi", "bank"] },
    upiId: { type: String, trim: true, default: "" },
    bankAccountName: { type: String, trim: true, default: "" },
    bankAccountNumber: { type: String, trim: true, default: "" },
    bankIfsc: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Earning", earningSchema);
