const express = require("express");
const qs = require('qs');
const axios = require("axios");
const paymentModel = require("../models/paymentModel");
const productModel = require("../models/productModel");
const orderModel = require("../models/orderModel");
const paymentRequestModel = require("../models/paymentRequestModel");
const sendMail = require("../controllers/sendMail");
const md5 = require("md5");
const querystring = require("querystring");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();
const fs = require("fs");
const nodemailer = require("nodemailer");
const browserMiddleware = require("../middlewares/browserMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");

router.post("/get-role", browserMiddleware, async (req, res) => {
  try {
    const { userid, zoneid, apiName } = req.body;
    const uid = process.env.UID;
    const email = process.env.EMAIL;
    const product = "mobilelegends";
    const time = Math.floor(Date.now() / 1000);
    const mKey = process.env.KEY;

    region = "philliphines";
    productid = "212";

    // GENERATING SIGN
    const signArr = {
      uid,
      email,
      product,
      time,
      userid,
      zoneid,
      productid,
    };
    const sortedSignArr = Object.fromEntries(Object.entries(signArr).sort());
    const str =
      Object.keys(sortedSignArr)
        .map((key) => `${key}=${sortedSignArr[key]}`)
        .join("&") +
      "&" +
      mKey;
    const sign = md5(md5(str));
    const formData = querystring.stringify({
      email,
      uid,
      userid,
      zoneid,
      product,
      productid,
      time,
      sign,
    });
    let apiUrl =
      region === "brazil"
        ? "https://www.smile.one/br/smilecoin/api/getrole"
        : "https://www.smile.one/ph/smilecoin/api/getrole";
    let role;
    role = await axios.post(apiUrl, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    if (role.data.status === 200) {
      return res.status(200).send({
        success: true,
        username: role.data.username,
        zone: role.data.zone,
        message: role.data.message,
      });
    } else {
      return res
        .status(201)
        .send({ success: false, message: role.data.message });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});
router.post("/get-user-payments", browserMiddleware, async (req, res) => {
  try {
    const payments = await paymentModel.find({ email: req.body.email });
    if (payments.length === 0) {
      return res
        .status(201)
        .send({ success: true, message: "No Payment Found" });
    }
    return res.status(200).send({
      success: true,
      message: "Payment Fetched successfully",
      data: payments,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});
router.get("/get-all-payments", adminAuthMiddleware, async (req, res) => {
  try {
    const payments = await paymentModel.find({});
    if (payments.length === 0) {
      return res
        .status(201)
        .send({ success: true, message: "No Payment Found" });
    }
    return res.status(200).send({
      success: true,
      message: "Payment Fetched successfully",
      data: payments,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

router.post("/create-api-upi-order", authMiddleware, async (req, res) => {
  try {
    const {
      order_id,
      txn_amount,
      txn_note,
      product_name,
      customer_name,
      customer_email,
      customer_mobile,
      callback_url,
    } = req.body;

    const pname = txn_note.split("@")[3];
    const amount = txn_note.split("@")[4];
    const product = await productModel.findOne({ name: pname });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const priceExists = product.cost.some(
      (item) =>
        item.amount === amount &&
        (parseFloat(item.price) === parseFloat(txn_amount) ||
          parseFloat(item.resPrice) === parseFloat(txn_amount))
    );
    if (!priceExists) {
      return res.status(400).json({
        message: "Amount does not match",
      });
    }

    const existingOrder = await orderModel.findOne({ orderId: order_id });
    if (existingOrder) {
      return res.redirect("https://wurustore.in/user-dashboard");
    }


    // let order_data = {
    //   'user_token': process.env.API_TOKEN,
    //   'order_id': order_id,
    //   'amount': txn_amount,
    //   'txn_amount': txn_amount,
    //   'txn_note': txn_note,
    //   'product_name': product_name,
    //   'customer_name':  customer_name,
    //   'customer_email': customer_email,
    //   'customer_mobile': customer_mobile,
    //   'redirect_url': callback_url,
    // };

    let upi_order = qs.stringify({
      'customer_mobile': customer_mobile,
      'user_token': process.env.API_TOKEN,
      'amount': txn_amount,
      'order_id': order_id,
      'redirect_url': callback_url,
    });

    const paymentRequest = new paymentRequestModel({
      orderId: order_id,
      txn_note: txn_note,
      customer_email: customer_email,
      customer_mobile: customer_mobile,
      txn_amount: txn_amount,
      product_name: product_name,
      customer_name: customer_name,
    });
    
    const payment_gateway_url = 'https://exgateway.com/api/create-order';

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: payment_gateway_url,
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data : upi_order
    };

    await paymentRequest.save();
    let response = await axios.request(config)
    // console.log(response)
    if(response.data && response.data.status === true)
    { 
      return res.status(200).send({ success: true, data: response.data });
    }
    // // res.cookie("orderInProgress", true);
    return res.status(200).send({ error: "payment gateway error" });

  } catch (error) {
    console.log("errorlog\n\n")
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/check-api-upi-order", browserMiddleware, async (req, res) => {
  try {
    const { orderId } = req.query;
    const paymentRequest = await paymentRequestModel.findOne({ orderId: orderId });

    if (paymentRequest === null)
    {
      return res.status(404).json({ message: "payment request not found!" });
    }

    const existingOrder = await orderModel.findOne({ orderId: orderId });
    if (existingOrder) {
      return res.redirect("https://wurustore.in/user-dashboard");
    }

    const payment_gateway_url = 'https://exgateway.com/api/check-order-status';

    let order_data = qs.stringify({
      'user_token': process.env.API_TOKEN,
      'order_id': orderId,
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: payment_gateway_url,
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data : order_data
    };

    let orderStatusResponse = await axios.request(config)

    const transactionDetails = orderStatusResponse.data.result;

    if (orderStatusResponse.data.status) {

      const transactionDetails = orderStatusResponse.data.result;

      if (transactionDetails.txnStatus === "SUCCESS") {
        const utr_number  = transactionDetails.utr;
        const {txn_note, customer_email, customer_mobile, txn_amount, product_name, customer_name} = paymentRequest;
        const order_id = paymentRequest.orderId;

        const [userid, zoneid, productids, pname, amount] = txn_note.split("@");
        const productid = productids.split("&");
        const region = product_name;

        const uid = process.env.UID;
        const email = process.env.EMAIL;
        const product = "mobilelegends";
        const time = Math.floor(Date.now() / 1000);
        const mKey = process.env.KEY;

        let orderResponse;
        for (let i = 0; i < productid.length; i++) {
          const signArr = {
            uid,
            email,
            product,
            time,
            userid,
            zoneid,
            productid: productid[i],
          };
          const sortedSignArr = Object.fromEntries(
            Object.entries(signArr).sort()
          );
          const str =
            Object.keys(sortedSignArr)
              .map((key) => `${key}=${sortedSignArr[key]}`)
              .join("&") +
            "&" +
            mKey;
          const sign = md5(md5(str));
          const formData = querystring.stringify({
            email,
            uid,
            userid,
            zoneid,
            product,
            productid: productid[i],
            time,
            sign,
          });
          const apiUrl =
            region === "brazil"
              ? "https://www.smile.one/br/smilecoin/api/createorder"
              : "https://www.smile.one/ph/smilecoin/api/createorder";
          orderResponse = await axios.post(apiUrl, formData, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });
        }

        const paymentObject = {
          name: customer_name,
          email: customer_email,
          mobile: customer_mobile,
          amount: txn_amount,
          orderId: order_id,
          status: transactionDetails.txnStatus,
          utrNumber: utr_number,
        };
        const existingPayment = await paymentModel.findOne({
          utrNumber: utr_number,
        });
        if (!existingPayment) {
          const newPayment = new paymentModel(paymentObject);
          await newPayment.save();
        }

        if (orderResponse?.data?.status === 200) {
          const order = new orderModel({
            api: "yes",
            orderDetails: amount,
            orderId: order_id,
            productinfo: pname,
            amount: txn_amount,
            email: customer_email,
            mobile: customer_mobile,
            userId: userid,
            zoneId: zoneid,
            status: "success",
          });
          await order.save();

          //!send mail
          try {
            const dynamicData = {
              orderId: `${order_id}`,
              amount: `${amount}`,
              price: `${txn_amount}`,
              p_info: `${pname}`,
              userId: `${userid}`,
              zoneId: `${zoneid}`,
            };
            let htmlContent = fs.readFileSync("order.html", "utf8");
            Object.keys(dynamicData).forEach((key) => {
              const placeholder = new RegExp(`{${key}}`, "g");
              htmlContent = htmlContent.replace(placeholder, dynamicData[key]);
            });
            // Send mail
            let mailTransporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                user: process.env.SENDING_EMAIL,
                pass: process.env.MAIL_PASS,
              },
            });
            let mailDetails = {
              from: process.env.SENDING_EMAIL,
              to: `${customer_email}`,
              subject: "Order Successful!",
              html: htmlContent,
            };
            mailTransporter.sendMail(mailDetails, function (err, data) {
              if (err) {
                console.log(err);
              }
            });
          } catch (error) {
            console.error("Error sending email:", error);
          }
          return res.redirect("https://wurustore.in/user-dashboard");
        } else {
          console.error("Error placing order:", orderResponse?.data?.message);
          return res.status(500).json({ error: "Error placing order" });
        }
      } else {
        console.error("OrderID Not Found");
        return res.status(404).json({ error: "OrderID Not Found" });
      }
    }
  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
