const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const {
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
} = require("../controllers/app.controller");

const router = express.Router();

router.use(protect); // Ensure all app routes are protected

router.get("/home", getHomeData);
router.get("/categories", getCategories);
router.get("/products", getProducts);
router.get("/products/:code", getProductByCode);
router.get("/earnings/summary", getEarningSummary);
router.get("/earnings/transactions", getEarningTransactions);
router.post("/earnings/withdraw", createWithdrawal);
router.post("/referrals", createReferral);
router.post("/referrals/share", trackReferralShare);
router.get("/notifications", getNotifications);
router.post("/notifications/read-all", markAllRead);
router.get("/notifications/unread-count", getUnreadCount);
router.delete("/notifications/:id", deleteNotification);

module.exports = router;
