const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const {
  login,
  sendUserOtp,
  verifyUserOtp,
  getMe,
  updateMyProfile,
  updateMyLocation,
  deleteMyAccount,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/login", login);
router.post("/user/send-otp", sendUserOtp);
router.post("/user/verify-otp", verifyUserOtp);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMyProfile);
router.patch("/me/location", protect, updateMyLocation);
router.delete("/me", protect, deleteMyAccount);

module.exports = router;
