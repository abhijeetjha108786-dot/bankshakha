const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/user.model");
const Customer = require("../models/customer.model");
const Earning = require("../models/earning.model");
const Notification = require("../models/notification.model");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

function normalizePhone(phone) {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    throw new ApiError(400, "Invalid phone number");
  }
  return digits;
}

function buildToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, phone: user.phone || undefined },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email: String(email).toLowerCase(), role: "admin" });
  if (!user || !user.isActive || !user.password) {
    throw new ApiError(401, "Invalid credentials");
  }

  const matched = await bcrypt.compare(password, user.password);
  if (!matched) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = buildToken(user);

  res.json({
    success: true,
    message: "Login successful",
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

const sendUserOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const providedName = String(req.body.name || "").trim();
  const generatedEmail = `${phone}@user.bankshakha.local`;

  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({
      phone,
      email: generatedEmail,
      name: providedName || `User ${phone.slice(-4)}`,
      role: "user",
      isActive: true,
    });
  }

  if (!user.isActive) {
    throw new ApiError(403, "User account is inactive");
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpCodeHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  user.otpCodeHash = otpCodeHash;
  user.otpExpiresAt = otpExpiresAt;
  if (!user.email) {
    user.email = generatedEmail;
  }
  if (providedName) {
    user.name = providedName;
  }
  await user.save();

  res.json({
    success: true,
    message: "OTP sent successfully",
    data: {
      phone,
      expiresAt: otpExpiresAt.toISOString(),
      devOtp: env.NODE_ENV === "production" && !env.ALLOW_DEV_OTP ? undefined : otp,
    },
  });
});

const verifyUserOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const otp = String(req.body.otp || "").trim();

  if (!otp || otp.length < 4) {
    throw new ApiError(400, "OTP is required");
  }

  const user = await User.findOne({ phone, role: "user" });
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid login request");
  }

  if (!user.otpCodeHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new ApiError(400, "OTP expired. Please request a new OTP.");
  }

  const matched = await bcrypt.compare(otp, user.otpCodeHash);
  if (!matched) {
    throw new ApiError(401, "Invalid OTP");
  }

  user.otpCodeHash = null;
  user.otpExpiresAt = null;
  await user.save();

  const token = buildToken(user);

  res.json({
    success: true,
    message: "Login successful",
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        city: user.city || "",
        locationPermissionGranted: user.locationPermissionGranted,
      },
    },
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      city: user.city || "",
      locationPermissionGranted: user.locationPermissionGranted,
    },
  });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const name = String(req.body?.name || "").trim();
  const city = String(req.body?.city || "").trim();

  if (!name) {
    throw new ApiError(400, "Name is required");
  }

  if (name.length < 2 || name.length > 60) {
    throw new ApiError(400, "Name must be between 2 and 60 characters");
  }

  if (city.length > 80) {
    throw new ApiError(400, "City must be at most 80 characters");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      name,
      city,
    },
    {
      new: true,
      runValidators: true,
    }
  ).select("name email phone role city locationPermissionGranted");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      city: user.city || "",
      locationPermissionGranted: user.locationPermissionGranted,
    },
  });
});

const updateMyLocation = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { city, locationPermissionGranted } = req.body || {};

  if (typeof locationPermissionGranted !== "boolean") {
    throw new ApiError(400, "locationPermissionGranted must be true or false");
  }

  const payload = {
    locationPermissionGranted,
  };

  if (locationPermissionGranted) {
    payload.city = String(city || "").trim();
  } else {
    payload.city = "";
  }

  const user = await User.findByIdAndUpdate(userId, payload, {
    new: true,
    runValidators: true,
  }).select("name email phone role city locationPermissionGranted");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.json({
    success: true,
    message: "Location preference updated",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      city: user.city || "",
      locationPermissionGranted: user.locationPermissionGranted,
    },
  });
});

const deleteMyAccount = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  if (req.user?.role !== "user") {
    throw new ApiError(403, "Only app users can delete their own account from app");
  }

  const [deletedCustomers, deletedEarnings, deletedNotifications] = await Promise.all([
    Customer.deleteMany({ createdBy: userId }),
    Earning.deleteMany({ userId }),
    Notification.deleteMany({ recipientUsers: userId }),
  ]);

  await Notification.updateMany(
    { $or: [{ readBy: userId }, { deletedBy: userId }, { recipientUsers: userId }] },
    {
      $pull: {
        readBy: userId,
        deletedBy: userId,
        recipientUsers: userId,
      },
    }
  );

  await User.deleteOne({ _id: userId, role: "user" });

  res.json({
    success: true,
    message: "Account and related app data deleted successfully",
    data: {
      deletedCustomers: deletedCustomers.deletedCount || 0,
      deletedEarnings: deletedEarnings.deletedCount || 0,
      deletedNotifications: deletedNotifications.deletedCount || 0,
    },
  });
});

module.exports = {
  login,
  sendUserOtp,
  verifyUserOtp,
  getMe,
  updateMyProfile,
  updateMyLocation,
  deleteMyAccount,
};
