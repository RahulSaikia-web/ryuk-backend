const mongoose = require("mongoose");

const paymentRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    txn_note: {
      type: String,
    },
    customer_email: {
      type: String,
    },
    customer_mobile: {
      type: String,
    },
    txn_amount: {
      type: String,
    },
    product_name: {
      type: String,
      default: null,
    },
    customer_name: {
        type: String,
    },
  },
  {
    timestamps: true,
  }
);

const paymentRequestModel = mongoose.model("paymentRequest", paymentRequestSchema);
module.exports = paymentRequestModel;
