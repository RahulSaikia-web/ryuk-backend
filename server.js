const express = require("express");
const path = require("path");
const colors = require("colors");
const moragan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const session = require("express-session");
const bodyParser = require("body-parser");
const fs = require("fs");
var cors = require("cors");

// dotenv
dotenv.config();
connectDB();
const app = express();
app.set('trust proxy', 1);

// Set up session middleware
app.use(
  session({
    secret: "WURU@#$!@#",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 3 * 60 * 1000,
    },
  })
);

// middlewares
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(moragan("dev"));
app.use(express.static(path.join(__dirname, "public")));

// Static file for images
// PRODUCT
app.use(
  "/productImages",
  express.static(path.join(__dirname, "productImages"))
);
app.use("/", express.static("productImages"));
app.use("/admin-products", express.static("productImages"));
app.use("/admin-edit-product/:id", express.static("productImages"));
app.use("/admin-view-order/:id", express.static("productImages"));
app.use("/product/", express.static("productImages"));
app.use("/product/:name", express.static("productImages"));
//!
app.use("/gallery", express.static(path.join(__dirname, "gallery")));
app.use("/gallery", express.static("gallery"));
app.use("/product/:name", express.static("gallery"));
//!
app.use(
  "/notificationImages",
  express.static(path.join(__dirname, "notificationImages"))
);
// app.use("/gallery", express.static("gallery"));

// routes
app.use("/api/user/", require("./routes/userRoutes"));
app.use("/api/admin/", require("./routes/adminRoutes"));
app.use("/api/product/", require("./routes/productRoutes"));
app.use("/api/order/", require("./routes/orderRoutes"));
app.use("/api/payment/", require("./routes/paymentRoutes"));
app.use("/api/moogold/", require("./routes/moogoldRoutes.js"));
app.use("/api/media/", require("./routes/adminMediaUploadRouter.js"));
app.use("/api/group/", require("./routes/groupRoutes.js"));
app.use("/api/tab/", require("./routes/tabRoutes.js"));
app.use("/api/stats/", require("./routes/statsRouter.js"));

// PORT
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("API running...");
});


// Listen
app.listen(port, (req, res) => {
  console.log(
    `Server running in ${process.env.NODE_MODE} Mode on Port ${process.env.PORT}`
      .bgCyan
  );
});
