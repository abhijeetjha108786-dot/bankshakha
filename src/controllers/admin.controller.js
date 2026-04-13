const Category = require("../models/category.model");
const Product = require("../models/product.model");
const Customer = require("../models/customer.model");
const Earning = require("../models/earning.model");
const Notification = require("../models/notification.model");
const SuccessStory = require("../models/successStory.model");
const Banner = require("../models/banner.model");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { calculateEarningStats } = require("../utils/earnings");

function requireFields(payload, fields) {
  for (const field of fields) {
    if (!payload[field]) {
      throw new ApiError(400, `${field} is required`);
    }
  }
}

function getInitial(value) {
  return String(value || "").trim().charAt(0).toUpperCase();
}

const getDashboard = asyncHandler(async (req, res) => {
  const [
    categoryCount,
    productCount,
    customerCount,
    appUserCount,
    notificationCount,
    storyCount,
    bannerCount,
    earnings,
    pendingEarningsCount,
  ] =
    await Promise.all([
      Category.countDocuments(),
      Product.countDocuments(),
      Customer.countDocuments(),
      User.countDocuments({ role: "user" }),
      Notification.countDocuments(),
      SuccessStory.countDocuments(),
      Banner.countDocuments(),
      Earning.find({ status: "approved" }).lean(),
      Earning.countDocuments({ status: "pending" }),
    ]);

  const { totalEarnedValue, monthlyEarnedValue, todayEarning } = calculateEarningStats(earnings);

  res.json({
    success: true,
    data: {
      categoryCount,
      productCount,
      customerCount,
      appUserCount,
      notificationCount,
      storyCount,
      bannerCount,
      totalEarnings: totalEarnedValue,
      monthlyEarnings: monthlyEarnedValue,
      todayEarnings: todayEarning,
      pendingEarningsCount,
    },
  });
});

const getManagementData = asyncHandler(async (req, res) => {
  const [categories, products, customers, appUsers, earnings, notifications, stories, banners] = await Promise.all([
    Category.find().sort({ createdAt: 1 }).lean(),
    Product.find().sort({ createdAt: -1 }).lean(),
    Customer.find().sort({ createdAt: -1 }).lean(),
    User.find({ role: "user" })
      .select("name phone city locationPermissionGranted isActive createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    Earning.find()
      .populate("userId", "name phone")
      .sort({ createdAt: -1 })
      .lean(),
    Notification.find()
      .populate("recipientUsers", "name phone")
      .sort({ createdAt: -1 })
      .lean(),
    SuccessStory.find().sort({ createdAt: -1 }).lean(),
    Banner.find().sort({ sortOrder: 1, createdAt: -1 }).lean(),
  ]);

  res.json({
    success: true,
    data: {
      categories,
      products,
      customers,
      appUsers,
      earnings,
      notifications,
      stories,
      banners,
    },
  });
});

const updateAppUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive must be true or false");
  }

  const user = await User.findOneAndUpdate(
    { _id: id, role: "user" },
    { isActive },
    { new: true, runValidators: true }
  ).select("name phone isActive createdAt updatedAt");

  if (!user) {
    throw new ApiError(404, "App user not found");
  }

  res.json({
    success: true,
    message: isActive ? "User unblocked successfully" : "User blocked successfully",
    data: user,
  });
});

const deleteAppUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findOneAndDelete({ _id: id, role: "user" });
  if (!user) {
    throw new ApiError(404, "App user not found");
  }

  res.json({ success: true, message: "App user deleted successfully" });
});

const createCategory = asyncHandler(async (req, res) => {
  const payload = req.body;
  requireFields(payload, ["slug", "title", "icon", "color"]);

  const exists = await Category.findOne({ slug: payload.slug.trim().toLowerCase() });
  if (exists) {
    throw new ApiError(409, "Category slug already exists");
  }

  const category = await Category.create({
    slug: payload.slug.trim().toLowerCase(),
    title: payload.title.trim(),
    icon: payload.icon.trim(),
    color: payload.color.trim(),
    isActive: payload.isActive !== false,
  });

  res.status(201).json({ success: true, data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  if (payload.slug) {
    payload.slug = String(payload.slug).trim().toLowerCase();
    const duplicate = await Category.findOne({
      slug: payload.slug,
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      throw new ApiError(409, "Category slug already exists");
    }
  }

  const category = await Category.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  res.json({ success: true, data: category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  await Product.updateMany({ categorySlug: category.slug }, { isActive: false });

  res.json({ success: true, message: "Category deleted and related products deactivated" });
});

const createProduct = asyncHandler(async (req, res) => {
  const payload = req.body;
  const required = ["productCode", "categorySlug", "name", "description", "commission", "logo"];
  requireFields(payload, required);

  const normalizedCode = payload.productCode.trim().toLowerCase();
  const normalizedCategorySlug = payload.categorySlug.trim().toLowerCase();

  const [exists, category] = await Promise.all([
    Product.findOne({ productCode: normalizedCode }),
    Category.findOne({ slug: normalizedCategorySlug }),
  ]);

  if (exists) {
    throw new ApiError(409, "Product code already exists");
  }
  if (!category) {
    throw new ApiError(400, "Invalid categorySlug");
  }

  const product = await Product.create({
    productCode: normalizedCode,
    categorySlug: normalizedCategorySlug,
    name: payload.name.trim(),
    description: payload.description.trim(),
    commission: payload.commission.trim(),
    logo: payload.logo.trim(),
    benefits: Array.isArray(payload.benefits) ? payload.benefits : [],
    howToEarn: Array.isArray(payload.howToEarn) ? payload.howToEarn : [],
    terms: Array.isArray(payload.terms) ? payload.terms : [],
    isActive: payload.isActive !== false,
  });

  res.status(201).json({ success: true, data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  if (payload.productCode) {
    payload.productCode = String(payload.productCode).trim().toLowerCase();
    const duplicate = await Product.findOne({
      productCode: payload.productCode,
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      throw new ApiError(409, "Product code already exists");
    }
  }

  if (payload.categorySlug) {
    payload.categorySlug = String(payload.categorySlug).trim().toLowerCase();
    const category = await Category.findOne({ slug: payload.categorySlug });
    if (!category) {
      throw new ApiError(400, "Invalid categorySlug");
    }
  }

  const product = await Product.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  res.json({ success: true, data: product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  res.json({ success: true, message: "Product deleted" });
});

const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, city, referredProductCode } = req.body;
  if (!name || !phone) {
    throw new ApiError(400, "name and phone are required");
  }

  const normalizedPhone = String(phone).trim();
  const exists = await Customer.findOne({ phone: normalizedPhone });
  if (exists) {
    throw new ApiError(409, "Customer with this phone already exists");
  }

  const customer = await Customer.create({
    name: String(name).trim(),
    phone: normalizedPhone,
    city: city ? String(city).trim() : "",
    referredProductCode: referredProductCode ? String(referredProductCode).trim().toLowerCase() : "",
    initial: getInitial(name),
  });
  res.status(201).json({ success: true, data: customer });
});

const updateCustomer = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.name) {
    payload.name = String(payload.name).trim();
    payload.initial = getInitial(payload.name);
  }

  if (payload.phone) {
    payload.phone = String(payload.phone).trim();
    const duplicate = await Customer.findOne({
      phone: payload.phone,
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      throw new ApiError(409, "Customer with this phone already exists");
    }
  }

  if (payload.referredProductCode) {
    payload.referredProductCode = String(payload.referredProductCode).trim().toLowerCase();
  }

  const customer = await Customer.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  res.json({ success: true, data: customer });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }
  res.json({ success: true, message: "Customer deleted" });
});

const createEarning = asyncHandler(async (req, res) => {
  const { title, amount, dateLabel, type } = req.body;
  requireFields(req.body, ["title", "amount", "dateLabel"]);

  const earning = await Earning.create({
    title: String(title).trim(),
    amount: Number(amount),
    dateLabel: String(dateLabel).trim(),
    type: type === "debit" ? "debit" : "credit",
    status: "approved",
    source: "manual",
  });

  res.status(201).json({ success: true, data: earning });
});

const verifyEarning = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!["approved", "rejected"].includes(String(status))) {
    throw new ApiError(400, "status must be approved or rejected");
  }

  const earning = await Earning.findById(id).populate("userId", "name phone");
  if (!earning) {
    throw new ApiError(404, "Earning transaction not found");
  }

  const currentStatus = String(earning.status || "");
  const nextStatus = String(status);

  if (currentStatus === nextStatus) {
    return res.json({
      success: true,
      message: `Earning already marked as ${nextStatus}`,
      data: earning,
    });
  }

  earning.status = nextStatus;
  earning.verifiedBy = req.user._id;
  earning.verifiedAt = new Date();
  await earning.save();

  if (earning.userId?._id) {
    const isWithdrawal = earning.source === "withdrawal" && earning.type === "debit";

    await Notification.create({
      title: status === "approved"
        ? isWithdrawal
          ? "Withdrawal Approved"
          : "Referral Verified"
        : isWithdrawal
          ? "Withdrawal Rejected"
          : "Referral Rejected",
      message: status === "approved"
        ? isWithdrawal
          ? `Your withdrawal request of INR ${earning.amount} has been approved and processed.`
          : `Your referral earning of INR ${earning.amount} is approved and added to withdraw balance.`
        : isWithdrawal
          ? `Your withdrawal request of INR ${earning.amount} was rejected by admin.`
          : `Your referral earning request for ${earning.customerName || "customer"} was rejected by admin.`,
      time: "Just now",
      type: nextStatus === "approved" ? (isWithdrawal ? "success" : "earning") : "warning",
      recipientUsers: [earning.userId._id],
    });
  }

  res.json({
    success: true,
    message: nextStatus === "approved" ? "Earning approved successfully" : "Earning rejected successfully",
    data: earning,
  });
});

const updateEarning = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.amount !== undefined) {
    payload.amount = Number(payload.amount);
  }
  if (payload.type && payload.type !== "credit" && payload.type !== "debit") {
    throw new ApiError(400, "type must be credit or debit");
  }

  const earning = await Earning.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!earning) {
    throw new ApiError(404, "Earning transaction not found");
  }
  res.json({ success: true, data: earning });
});

const deleteEarning = asyncHandler(async (req, res) => {
  const earning = await Earning.findByIdAndDelete(req.params.id);
  if (!earning) {
    throw new ApiError(404, "Earning transaction not found");
  }
  res.json({ success: true, message: "Earning transaction deleted" });
});

const createNotification = asyncHandler(async (req, res) => {
  const { title, message, time, type } = req.body;
  if (!title || !message) {
    throw new ApiError(400, "title and message are required");
  }

  const notification = await Notification.create({
    title: String(title).trim(),
    message: String(message).trim(),
    time: time ? String(time).trim() : "Just now",
    type: type || "info",
  });

  res.status(201).json({ success: true, data: notification });
});

const sendNotificationToAppUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, message, time, type } = req.body;

  if (!title || !message) {
    throw new ApiError(400, "title and message are required");
  }

  const appUser = await User.findOne({ _id: id, role: "user" }).select("_id name phone");
  if (!appUser) {
    throw new ApiError(404, "App user not found");
  }

  const notification = await Notification.create({
    title: String(title).trim(),
    message: String(message).trim(),
    time: time ? String(time).trim() : "Just now",
    type: type || "info",
    recipientUsers: [appUser._id],
  });

  res.status(201).json({
    success: true,
    message: "Notification sent to selected user",
    data: notification,
  });
});

const updateNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }
  res.json({ success: true, data: notification });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndDelete(req.params.id);
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }
  res.json({ success: true, message: "Notification deleted" });
});

const bulkDeleteNotifications = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
  if (!ids.length) {
    throw new ApiError(400, "ids array is required");
  }

  const result = await Notification.deleteMany({ _id: { $in: ids } });
  res.json({
    success: true,
    message: `${result.deletedCount} notification(s) deleted`,
    data: { deletedCount: result.deletedCount },
  });
});

const createStory = asyncHandler(async (req, res) => {
  const payload = req.body;
  requireFields(payload, ["name", "location", "quote", "color"]);

  const story = await SuccessStory.create({
    name: String(payload.name).trim(),
    location: String(payload.location).trim(),
    quote: String(payload.quote).trim(),
    color: String(payload.color).trim(),
    avatar: payload.avatar ? String(payload.avatar).trim().charAt(0).toUpperCase() : getInitial(payload.name),
  });

  res.status(201).json({ success: true, data: story });
});

const updateStory = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.avatar) {
    payload.avatar = String(payload.avatar).trim().charAt(0).toUpperCase();
  }

  const story = await SuccessStory.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!story) {
    throw new ApiError(404, "Success story not found");
  }
  res.json({ success: true, data: story });
});

const deleteStory = asyncHandler(async (req, res) => {
  const story = await SuccessStory.findByIdAndDelete(req.params.id);
  if (!story) {
    throw new ApiError(404, "Success story not found");
  }
  res.json({ success: true, message: "Success story deleted" });
});

const createBanner = asyncHandler(async (req, res) => {
  const { title, imageUrl, sortOrder, isActive } = req.body || {};
  if (!imageUrl || !String(imageUrl).trim()) {
    throw new ApiError(400, "imageUrl is required");
  }

  const banner = await Banner.create({
    title: String(title || "").trim(),
    imageUrl: String(imageUrl).trim(),
    sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 1,
    isActive: isActive !== false,
  });

  res.status(201).json({ success: true, data: banner });
});

const updateBanner = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.imageUrl !== undefined) {
    payload.imageUrl = String(payload.imageUrl || "").trim();
    if (!payload.imageUrl) {
      throw new ApiError(400, "imageUrl is required");
    }
  }
  if (payload.title !== undefined) {
    payload.title = String(payload.title || "").trim();
  }
  if (payload.sortOrder !== undefined) {
    payload.sortOrder = Number(payload.sortOrder);
    if (!Number.isFinite(payload.sortOrder)) {
      throw new ApiError(400, "sortOrder must be a valid number");
    }
  }

  const banner = await Banner.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!banner) {
    throw new ApiError(404, "Banner not found");
  }

  res.json({ success: true, data: banner });
});

const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) {
    throw new ApiError(404, "Banner not found");
  }
  res.json({ success: true, message: "Banner deleted" });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const userId = req.user._id; // From protect middleware

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (name) user.name = String(name).trim();
  if (email) user.email = String(email).trim().toLowerCase();
  
  if (password && String(password).trim().length > 0) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(password).trim(), salt);
  }

  await user.save();

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

module.exports = {
  getDashboard,
  getManagementData,
  updateAppUserStatus,
  deleteAppUser,
  updateProfile,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createEarning,
  verifyEarning,
  updateEarning,
  deleteEarning,
  createNotification,
  sendNotificationToAppUser,
  updateNotification,
  deleteNotification,
  bulkDeleteNotifications,
  createStory,
  updateStory,
  deleteStory,
  createBanner,
  updateBanner,
  deleteBanner,
};
