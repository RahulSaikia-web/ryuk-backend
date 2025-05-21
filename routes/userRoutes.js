const express = require("express");
const {
  loginController,
  registerController,
  authController,
  getAllUserController,
  DeleteUserController,
  getUserController,
  sendMailController,
  verifyOtpController,
  updatePassController,
  updateUserController,
  adminController,
  subscribeController,
  userProfileUpdateController,
  checkPlayerController,
  registerOtpController,
  sendMobileOtpController,
} = require("../controllers/userCtrl");
const authMiddleware = require("../middlewares/authMiddleware");
const browserMiddleware = require("../middlewares/browserMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");

// router object
const router = express.Router();
// routes
router.post("/login", browserMiddleware, loginController);
router.post("/register", browserMiddleware, registerController);
router.post(
  "/user-profile-update",
  browserMiddleware,
  userProfileUpdateController
);
router.post("/getUserData", browserMiddleware, authMiddleware, authController);

router.post("/send-otp", browserMiddleware, sendMailController);
router.post("/verify-otp", browserMiddleware, verifyOtpController);

module.exports = router;
