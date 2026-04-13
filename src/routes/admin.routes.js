const express = require("express");
const { protect, adminOnly } = require("../middlewares/auth.middleware");
const {
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
} = require("../controllers/admin.controller");

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/dashboard", getDashboard);
router.get("/management-data", getManagementData);
router.patch("/app-users/:id/status", updateAppUserStatus);
router.delete("/app-users/:id", deleteAppUser);
router.put("/profile", updateProfile);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
router.post("/customers", createCustomer);
router.put("/customers/:id", updateCustomer);
router.delete("/customers/:id", deleteCustomer);
router.post("/earnings", createEarning);
router.patch("/earnings/:id/verify", verifyEarning);
router.put("/earnings/:id", updateEarning);
router.delete("/earnings/:id", deleteEarning);
router.post("/notifications", createNotification);
router.post("/notifications/bulk-delete", bulkDeleteNotifications);
router.post("/app-users/:id/notifications", sendNotificationToAppUser);
router.put("/notifications/:id", updateNotification);
router.delete("/notifications/:id", deleteNotification);
router.post("/stories", createStory);
router.put("/stories/:id", updateStory);
router.delete("/stories/:id", deleteStory);
router.post("/banners", createBanner);
router.put("/banners/:id", updateBanner);
router.delete("/banners/:id", deleteBanner);

module.exports = router;
