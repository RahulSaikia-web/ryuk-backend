const express = require("express");
const {
  placeOrderController,
  trackOrderController,
  getAllOrdersController,
  getOrderByIdController,
  updateResIdController,
  updateOrderStatus,
  orderSumController,
} = require("../controllers/orderCtrl");
const authMiddleware = require("../middlewares/authMiddleware");
const browserMiddleware = require("../middlewares/browserMiddleware");

// router object
const router = express.Router();

// routes
router.post("/get-user-orders", authMiddleware, getAllOrdersController);
router.post("/get-order-by-id", authMiddleware, getOrderByIdController);
router.post("/track-order", browserMiddleware, trackOrderController);
router.get("/sum", browserMiddleware, orderSumController);

module.exports = router;
