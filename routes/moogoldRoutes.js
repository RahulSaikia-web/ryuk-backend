const express = require("express");
const axios = require("axios");
const qs = require('qs');
const base64 = require("base-64");
const paymentModel = require("../models/paymentModel");
const productModel = require("../models/productModel");
const orderModel = require("../models/orderModel");
const paymentRequestModel = require("../models/paymentRequestModel");
const fs = require("fs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const browserMiddleware = require("../middlewares/browserMiddleware");
const { error } = require("console");
const router = express.Router();

const generateBasicAuthHeader = () => {
  const credentials = `${process.env.MOOGOLD_PARTNER_ID}:${process.env.MOOGOLD_SECRET}`;
  return `Basic ${base64.encode(credentials)}`;
};
const generateAuthSignature = (payload, timestamp, path) => {
  const stringToSign = `${JSON.stringify(payload)}${timestamp}${path}`;
  return crypto
    .createHmac("sha256", process.env.MOOGOLD_SECRET)
    .update(stringToSign)
    .digest("hex");
};

router.post("/moogold-product", async (req, res) => {
  const productID = req.body.product_id;

  if (!productID) {
    return res.status(400).send({ error: "Product ID is required" });
  }

  const payload = {
    path: "product/product_detail",
    product_id: productID,
  };

  const timestamp = Math.floor(Date.now() / 1000); // Current UNIX timestamp
  const path = "product/product_detail";
  const stringToSign = `${JSON.stringify(payload)}${timestamp}${path}`;
  const authSignature = require("crypto")
    .createHmac("sha256", process.env.MOOGOLD_SECRET)
    .update(stringToSign)
    .digest("hex");

  try {
    const response = await axios.post(
      "https://moogold.com/wp-json/v1/api/product/product_detail",
      payload,
      {
        headers: {
          Authorization: generateBasicAuthHeader(),
          auth: authSignature,
          timestamp: timestamp,
        },
      }
    );
    return res
      .status(200)
      .send({ success: true, message: "Product Fetched", data: response.data });
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res
        .status(500)
        .send({ error: "An error occurred while fetching the product list" });
    }
  }
});

router.post("/moogold-servers", browserMiddleware, async (req, res) => {
  const productID = req.body.product_id;

  if (!productID) {
    return res.status(400).send({ error: "Product ID is required" });
  }

  const payload = {
    path: "product/server_list",
    product_id: productID,
  };

  const timestamp = Math.floor(Date.now() / 1000); // Current UNIX timestamp
  const path = "product/server_list";
  const stringToSign = `${JSON.stringify(payload)}${timestamp}${path}`;
  const authSignature = require("crypto")
    .createHmac("sha256", process.env.MOOGOLD_SECRET)
    .update(stringToSign)
    .digest("hex");

  try {
    const response = await axios.post(
      "https://moogold.com/wp-json/v1/api/product/server_list",
      payload,
      {
        headers: {
          Authorization: generateBasicAuthHeader(),
          auth: authSignature,
          timestamp: timestamp,
        },
      }
    );
    return res
      .status(200)
      .send({ success: true, message: "Product Fetched", data: response.data });
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res
        .status(500)
        .send({ error: "An error occurred while fetching the product list" });
    }
  }
});

router.get("/check-moogold-upi-order", browserMiddleware, async (req, res) => {
  try {
    const { orderId } = req.query;
    // console.log(orderId)
    const paymentRequest = await paymentRequestModel.findOne({ orderId: orderId });
    if (paymentRequest === null)
    {
      return res.status(404).json({ message: "payment request not found!" });
    }
    
    // console.log(paymentRequest)
    // return res.status(418).json({ message: "Teaaaa pot \n\n" });

    const existingPayment = await paymentModel.findOne({
      orderId: orderId,
    });
    if (existingPayment) {
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

    // console.log(orderStatusResponse.data)
    //test payment
    const transactionDetails = orderStatusResponse.data.result;
    // console.log(transactionDetails)
    // return res.status(418).json({ message: "Teaaaa pot \n\n" });

    if (orderStatusResponse.data.status) {
      
      const transactionDetails = orderStatusResponse.data.result;
      
      if (transactionDetails.txnStatus === "SUCCESS") {
        const utr_number  = transactionDetails.utr;
        const {txn_note, customer_email, customer_mobile, txn_amount, product_name, customer_name} = paymentRequest;
        const order_id = paymentRequest.orderId;

        // saving payment
        const paymentObject = {
          name: customer_name,
          email: customer_email,
          mobile: customer_mobile,
          amount: txn_amount,
          orderId: order_id,
          status: transactionDetails.txnStatus,
          utrNumber: utr_number,
        };
        const newPayment = new paymentModel(paymentObject);
        await newPayment.save();

        const [userid, zoneid, productid, pname, amount] = txn_note.split("@");
        const gameName = product_name;

        console.log(userid);
        console.log(zoneid);
        console.log(productid);
        console.log(pname);
        console.log(amount);

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
          return res.status(400).json({ message: "Amount does not match" });
        }

        console.log("Payload");

        let payload;
        // genshin, zenless, honkai (USER ID SERVER)
        if (
          gameName === "428075" ||
          gameName === "9477186" ||
          gameName === "4233885"
        ) {
          payload = {
            path: "order/create_order",
            data: {
              category: 1,
              "product-id": productid,
              quantity: 1,
              "User ID": userid,
              Server: zoneid,
            },
          };
          // coc, brawl,  (PLAYER TAG)
        } else if (gameName === "4427071" || gameName === "4427073") {
          payload = {
            path: "order/create_order",
            data: {
              category: 1,
              "product-id": productid,
              quantity: 1,
              "Player Tag": userid,
            },
          };
          // pubg
        } else if (gameName === "6963") {
          payload = {
            path: "order/create_order",
            data: {
              category: 1,
              "product-id": productid,
              quantity: 1,
              "Character ID": userid,
            },
          };
          // hok
        } else if (gameName === "5177311") {
          payload = {
            path: "order/create_order",
            data: {
              category: 1,
              "product-id": productid,
              quantity: 1,
              "Player ID": userid,
            },
          };
          // mlbb
        } else {
          payload = {
            path: "order/create_order",
            data: {
              category: 1,
              "product-id": productid,
              quantity: 1,
              "User ID": userid,
              "Server ID": zoneid,
              fields: [userid, zoneid],
            },
          };
        }

        console.log(payload);

        const timestamp = Math.floor(Date.now() / 1000);
        const path = "order/create_order";
        const authSignature = generateAuthSignature(payload, timestamp, path);

        console.log("Making Moogold Order");

        const response = await axios.post(
          "https://moogold.com/wp-json/v1/api/order/create_order",
          payload,
          {
            headers: {
              Authorization: generateBasicAuthHeader(),
              auth: authSignature,
              timestamp: timestamp,
            },
          }
        );

        console.log(response.data);

        if (response.status) {
          //! SAVING ORDER DETAILS
          const order = new orderModel({
            api: "yes",
            productinfo: pname,
            orderDetails: amount,
            amount: txn_amount,
            orderId: orderId,
            email: customer_email,
            mobile: customer_mobile,
            userId: userid,
            zoneId: zoneid,
            status: "success",
          });
          await order.save();
        }

        try {
          const dynamicData = {
            orderId: `${orderId}`,
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
        console.log(error)
        console.error("OrderID Not Found");
        return res.status(404).json({ error: "OrderID Not Found" });
      }
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: "Internal server error last" });
  }
});

module.exports = router;
