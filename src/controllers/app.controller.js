const Category = require("../models/category.model");
const Product = require("../models/product.model");
const Customer = require("../models/customer.model");
const Earning = require("../models/earning.model");
const Notification = require("../models/notification.model");
const SuccessStory = require("../models/successStory.model");
const Banner = require("../models/banner.model");
const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { calculateEarningStats } = require("../utils/earnings");

function normalizePhone(phone) {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    throw new ApiError(400, "Invalid phone number");
  }
  return digits;
}

function getInitial(value) {
  return String(value || "").trim().charAt(0).toUpperCase() || "U";
}

function formatDateLabel(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function parseCommission(commissionText, referredAmount) {
  const text = String(commissionText || "").trim();
  if (!text) {
    return { amount: 0, calculation: "No commission config" };
  }

  const percentMatch = text.match(/(\d+(\.\d+)?)\s*%/);
  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    if (!Number.isFinite(referredAmount) || referredAmount <= 0) {
      return {
        amount: 0,
        calculation: `${percent}% commission. Final amount will be calculated by admin after verification.`,
      };
    }
    const amount = Number(((referredAmount * percent) / 100).toFixed(2));
    return { amount, calculation: `${percent}% of INR ${referredAmount}` };
  }

  const numberMatch = text.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  const amount = numberMatch ? Number(numberMatch[1]) : 0;
  return { amount, calculation: "Fixed commission" };
}

function buildNotificationVisibilityQuery(user) {
  const userId = user?._id;
  const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
  return {
    deletedBy: { $ne: userId },
    $or: [
      { recipientUsers: userId },
      {
        $and: [
          {
            $or: [{ recipientUsers: { $exists: false } }, { recipientUsers: { $size: 0 } }],
          },
          { createdAt: { $gte: userCreatedAt } },
        ],
      },
    ],
  };
}

const getHomeData = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const [categories, stories, banners, totalCustomers, earnings] = await Promise.all([
    Category.find({ isActive: true }).sort({ createdAt: 1 }).lean(),
    SuccessStory.find().sort({ createdAt: -1 }).limit(10).lean(),
    Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    Customer.countDocuments({ createdBy: userId }),
    Earning.find({ userId }).sort({ createdAt: -1 }).lean(),
  ]);

  const approvedEarnings = earnings.filter((tx) => tx.status === "approved");
  const { totalEarnedValue, monthlyEarnedValue, todayEarning } = calculateEarningStats(approvedEarnings);

  res.json({
    success: true,
    data: {
      categories,
      successStories: stories,
      banners,
      stats: {
        totalCustomers,
        totalEarnedValue,
        monthlyEarnedValue,
        todayEarning,
      },
    },
  });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ createdAt: 1 }).lean();
  res.json({ success: true, data: categories });
});

const getProducts = asyncHandler(async (req, res) => {
  const { categoryId, categorySlug, q } = req.query;
  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 200);
  const query = { isActive: true };

  if (categoryId || categorySlug) {
    query.categorySlug = String(categoryId || categorySlug);
  }

  if (q) {
    query.$or = [
      { name: { $regex: String(q), $options: "i" } },
      { description: { $regex: String(q), $options: "i" } },
    ];
  }

  const products = await Product.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ success: true, data: products });
});

const getProductByCode = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ productCode: req.params.code, isActive: true }).lean();
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  res.json({ success: true, data: product });
});

const getEarningSummary = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const transactions = await Earning.find({ userId }).sort({ createdAt: -1 }).lean();
  const approvedTransactions = transactions.filter((tx) => tx.status === "approved");
  const pendingTransactions = transactions.filter((tx) => tx.status === "pending" && tx.type === "credit");
  const pendingWithdrawalTransactions = transactions.filter(
    (tx) => tx.status === "pending" && tx.type === "debit" && tx.source === "withdrawal"
  );

  const { totalEarnedValue, monthlyEarnedValue } = calculateEarningStats(approvedTransactions);
  const pendingAmount = pendingTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const pendingWithdrawalAmount = pendingWithdrawalTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const availableBalance = Math.max(0, totalEarnedValue - pendingWithdrawalAmount);
  const thisMonth = monthlyEarnedValue;
  const totalEarned = totalEarnedValue;

  res.json({
    success: true,
    data: {
      availableBalance,
      thisMonth,
      totalEarned,
      pendingAmount,
      pendingWithdrawalAmount,
    },
  });
});

const getEarningTransactions = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const transactions = await Earning.find({ userId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: transactions });
});

const createWithdrawal = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  const amount = Number(req.body?.amount);
  const paymentMethod = String(req.body?.paymentMethod || "").trim().toLowerCase();
  const upiId = String(req.body?.upiId || "").trim();
  const bankAccountName = String(req.body?.bankAccountName || "").trim();
  const bankAccountNumber = String(req.body?.bankAccountNumber || "").trim();
  const bankIfsc = String(req.body?.bankIfsc || "").trim().toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "Valid withdrawal amount is required");
  }

  const minimumAmount = 500;
  if (amount < minimumAmount) {
    throw new ApiError(400, `Minimum withdrawal amount is INR ${minimumAmount}`);
  }

  if (paymentMethod !== "upi" && paymentMethod !== "bank") {
    throw new ApiError(400, "paymentMethod must be upi or bank");
  }

  if (paymentMethod === "upi") {
    if (!upiId || !/^[\w.\-]{2,}@[A-Za-z]{2,}$/i.test(upiId)) {
      throw new ApiError(400, "Valid UPI ID is required");
    }
  }

  if (paymentMethod === "bank") {
    if (!bankAccountName || !bankAccountNumber || !bankIfsc) {
      throw new ApiError(400, "bankAccountName, bankAccountNumber and bankIfsc are required");
    }
  }

  const approvedTransactions = await Earning.find({ userId, status: "approved" }).sort({ createdAt: -1 }).lean();
  const { totalEarnedValue } = calculateEarningStats(approvedTransactions);
  const pendingWithdrawals = await Earning.find({
    userId,
    source: "withdrawal",
    type: "debit",
    status: "pending",
  })
    .select("amount")
    .lean();

  const pendingWithdrawalAmount = pendingWithdrawals.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const availableBalance = Math.max(0, Number(totalEarnedValue || 0) - pendingWithdrawalAmount);

  if (availableBalance < minimumAmount) {
    throw new ApiError(400, `Minimum available balance for withdrawal is INR ${minimumAmount}.`);
  }

  if (amount > availableBalance) {
    const formattedAvailable = Math.max(0, Math.floor(availableBalance));
    throw new ApiError(400, `Insufficient balance. Available INR ${formattedAvailable}.`);
  }

  const now = new Date();
  const withdrawalTx = await Earning.create({
    userId,
    title: "Withdrawal Request",
    amount,
    dateLabel: formatDateLabel(now),
    type: "debit",
    status: "pending",
    source: "withdrawal",
    paymentMethod,
    upiId: paymentMethod === "upi" ? upiId : "",
    bankAccountName: paymentMethod === "bank" ? bankAccountName : "",
    bankAccountNumber: paymentMethod === "bank" ? bankAccountNumber : "",
    bankIfsc: paymentMethod === "bank" ? bankIfsc : "",
  });

  const adminUsers = await User.find({ role: "admin", isActive: true }).select("_id").lean();
  const adminRecipientIds = adminUsers.map((admin) => admin._id);

  await Notification.create({
    title: "New Withdrawal Request",
    message: `User requested INR ${amount} withdrawal via ${paymentMethod.toUpperCase()}.`,
    time: "Just now",
    type: "warning",
    recipientUsers: adminRecipientIds,
  });

  await Notification.create({
    title: "Withdrawal Request Submitted",
    message: `Your withdrawal request of INR ${amount} has been submitted for admin review.`,
    time: "Just now",
    type: "info",
    recipientUsers: [userId],
  });

  res.status(201).json({
    success: true,
    message: "Withdrawal request submitted successfully",
    data: {
      transaction: withdrawalTx,
      availableBalance,
    },
  });
});

const createReferral = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  const { productCode, customerName, customerPhone, city, referredAmount } = req.body || {};

  if (!productCode || !customerName || !customerPhone) {
    throw new ApiError(400, "productCode, customerName and customerPhone are required");
  }

  const normalizedProductCode = String(productCode).trim().toLowerCase();
  const normalizedName = String(customerName).trim();
  const normalizedPhone = normalizePhone(customerPhone);
  const normalizedCity = city ? String(city).trim() : "";
  const parsedReferredAmount = Number(referredAmount || 0);

  const product = await Product.findOne({ productCode: normalizedProductCode, isActive: true }).lean();
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const duplicate = await Customer.findOne({ phone: normalizedPhone, createdBy: userId });
  if (duplicate) {
    throw new ApiError(409, "You already referred this customer");
  }

  const customer = await Customer.create({
    name: normalizedName,
    phone: normalizedPhone,
    initial: getInitial(normalizedName),
    city: normalizedCity,
    referredProductCode: normalizedProductCode,
    createdBy: userId,
  });

  const commission = parseCommission(product.commission, parsedReferredAmount);
  const now = new Date();
  const earning = await Earning.create({
    userId,
    title: `Referral - ${product.name}`,
    amount: commission.amount,
    dateLabel: formatDateLabel(now),
    type: "credit",
    status: "pending",
    source: "referral",
    productCode: normalizedProductCode,
    productName: product.name,
    customerId: customer._id,
    customerName: customer.name,
    customerPhone: customer.phone,
    referredAmount: Number.isFinite(parsedReferredAmount) && parsedReferredAmount > 0 ? parsedReferredAmount : undefined,
  });

  await Notification.create({
    title: "Referral Submitted",
    message:
      commission.amount > 0
        ? `Referral submitted for ${customer.name}. INR ${commission.amount} is pending admin verification.`
        : `Referral submitted for ${customer.name}. Commission amount will be finalized after admin verification.`,
    time: "Just now",
    type: "info",
    recipientUsers: [userId],
  });

  res.status(201).json({
    success: true,
    message: "Referral submitted and sent for admin verification",
    data: {
      customer,
      earning,
      commissionCalculation: commission.calculation,
    },
  });
});

const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 200);

  const query = userId ? buildNotificationVisibilityQuery(req.user) : {};

  const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean();

  const data = notifications.map((n) => ({
    ...n,
    isRead: userId ? n.readBy?.some((id) => id.toString() === userId.toString()) : false,
  }));

  res.json({ success: true, data });
});

const markAllRead = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  // Find all notifications that the user hasn't read yet
  const unreadNotifications = await Notification.find({
    ...buildNotificationVisibilityQuery(req.user),
    readBy: { $ne: userId },
  });

  // Adding user ID to readBy for all unread notifications
  await Notification.updateMany(
    { _id: { $in: unreadNotifications.map((n) => n._id) } },
    { $addToSet: { readBy: userId } }
  );

  res.json({ success: true, message: "All notifications marked as read" });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { id } = req.params;

  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  const notification = await Notification.findById(id);

  if (!notification) {
    return res.json({
      success: true,
      message: "Notification already removed",
    });
  }

  const recipientUsers = Array.isArray(notification.recipientUsers) ? notification.recipientUsers : [];
  const isTargetedNotification = recipientUsers.length > 0;

  if (isTargetedNotification) {
    const isRecipient = recipientUsers.some((recipientId) => recipientId.toString() === userId.toString());
    if (!isRecipient) {
      throw new ApiError(403, "You are not allowed to delete this notification");
    }

    const remainingRecipients = recipientUsers.filter(
      (recipientId) => recipientId.toString() !== userId.toString()
    );

    if (!remainingRecipients.length) {
      await Notification.findByIdAndDelete(id);
      return res.json({
        success: true,
        message: "Notification permanently deleted",
      });
    }

    await Notification.findByIdAndUpdate(id, {
      $set: { recipientUsers: remainingRecipients },
      $pull: { readBy: userId, deletedBy: userId },
    });

    return res.json({
      success: true,
      message: "Notification removed from your account",
    });
  }

  await Notification.findByIdAndUpdate(id, { $addToSet: { deletedBy: userId } });

  res.json({ success: true, message: "Notification removed" });
});

const trackReferralShare = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  const channel = String(req.body?.channel || "share").trim();

  const notification = await Notification.create({
    title: "Thanks for sharing",
    message: `Your referral link was shared successfully via ${channel}. Keep growing your earnings!`,
    time: "Just now",
    type: "success",
    recipientUsers: [userId],
  });

  res.status(201).json({
    success: true,
    data: {
      notificationId: notification._id,
    },
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    return res.json({ success: true, data: 0 });
  }

  const count = await Notification.countDocuments({
    ...buildNotificationVisibilityQuery(req.user),
    readBy: { $ne: userId },
  });

  res.json({ success: true, data: count });
});

module.exports = {
  getHomeData,
  getCategories,
  getProducts,
  getProductByCode,
  getEarningSummary,
  getEarningTransactions,
  createWithdrawal,
  createReferral,
  getNotifications,
  markAllRead,
  deleteNotification,
  getUnreadCount,
  trackReferralShare,
};
