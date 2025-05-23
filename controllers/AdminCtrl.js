const userModel = require("../models/userModel");
const orderModel = require("../models/orderModel");
const sendMail = require("./sendMail");
const crypto = require("crypto");

const getAllUserController = async (req, res) => {
  try {
    const users = await userModel.find({
      email: { $nin: ["wuru495@gmail.com", "aashirdigital@gmail.com"] },
    });
    if (!users) {
      return res.status(200).send({ success: false, message: "No User Found" });
    }
    return res.status(200).send({
      success: true,
      message: "All Users Fetched Successfully",
      data: users,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ success: false, message: `Get All User Ctrl ${error.message}` });
  }
};

const getUserController = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.body.id });
    if (!user) {
      return res.status(200).send({ success: false, message: "No User Found" });
    }
    return res.status(200).send({
      success: true,
      message: "User Fetched Sucesss",
      data: user,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ success: false, message: `Get User Ctrl ${error.message}` });
  }
};

const deleteUserController = async (req, res) => {
  try {
    const user = await userModel.findOneAndDelete({ _id: req.body.id });
    if (!user) {
      return res
        .status(201)
        .send({ success: false, message: "Failed to delete" });
    }
    return res.status(200).send({
      success: true,
      message: "User Deleted Successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .send({ success: false, message: `Delete User Ctrl ${error.message}` });
  }
};

const editUserController = async (req, res) => {
  try {
    const { _id } = req.body;
    if (!_id) {
      return res.status(400).send({
        success: false,
        message: "msId is required in the request body",
      });
    }
    const updateUser = await userModel.findOneAndUpdate(
      { _id },
      { $set: req.body },
      { new: true }
    );
    if (!updateUser) {
      return res.status(200).send({
        success: false,
        message: "Failed to Update User",
      });
    }
    return res
      .status(201)
      .send({ success: true, message: "User Updated Successfully" });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: `Admin Edit User Ctrl ${error.message}`,
    });
  }
};

// ================= BULK EMAIL
const sendMailToIncompleteUsersController = async (req, res) => {
  try {
    const { incompleteUsers, msg } = req.body;

    if (!incompleteUsers || !msg) {
      return res
        .status(400)
        .send({ success: false, message: "Invalid request data" });
    }
    // Loop through incompleteUsers and send email to each user
    for (const user of incompleteUsers) {
      const { email } = user;
      await sendMail(email, "Incomplete Profile", "", msg);
    }

    res
      .status(200)
      .send({ success: true, message: "Emails sent to all users" });
  } catch (error) {
    console.error(`Send Mail to Incomplete Profiles Ctrl: ${error.message}`);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};

const addBrandController = async (req, res) => {
  try {
    const brand = await brandModel.findOne({ name: req.body.name });
    if (brand) {
      return res
        .status(200)
        .send({ success: false, message: "Brand name already exists" });
    }
    const newBrand = new brandModel(req.body);
    await newBrand.save();
    return res
      .status(200)
      .send({ success: true, message: "Brand Successfully Added" });
  } catch (error) {
    console.error(`Add Brand Ctrl: ${error.message}`);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};

const getAllBrandContoller = async (req, res) => {
  try {
    const brands = await brandModel.find({});
    if (brands.length === 0) {
      return res
        .status(200)
        .send({ success: false, message: "No brands found" });
    }
    return res
      .status(200)
      .send({ success: true, message: "Brand Fetched Success", data: brands });
  } catch (error) {
    console.error(`Get All Brands Ctrl: ${error.message}`);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};

const addModelController = async (req, res) => {
  try {
    const { name, model } = req.body;
    const brand = await brandModel.findOne({ name: name });
    if (!brand) {
      return res
        .status(200)
        .send({ success: false, message: "Brand not found" });
    }
    // brand.models = brand.models || [];
    // const isDuplicate = brand.models.some(
    //   (existingModel) => existingModel.modelName === model.modelName
    // );
    // if (isDuplicate) {
    //   return res
    //     .status(201)
    //     .send({ success: false, message: "Model already exists" });
    // }
    brand.models.push(model);
    const updatedBrand = await brand.save();
    return res.status(202).send({
      success: true,
      message: "Model added successfully",
      data: updatedBrand,
    });
  } catch (error) {
    console.error(`Add Model Controller Error: ${error.message}`);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};

const deleteModelController = async (req, res) => {
  try {
    const { name, modelName } = req.body;
    const brand = await brandModel.findOne({ name: name });
    if (!brand) {
      return res
        .status(200)
        .send({ success: false, message: "Brand not found" });
    }
    const modelIndex = brand.models.findIndex(
      (existingModel) => existingModel === modelName
    );
    if (modelIndex === -1) {
      return res
        .status(201)
        .send({ success: false, message: "Model not found" });
    }
    brand.models.splice(modelIndex, 1);
    const updatedBrand = await brand.save();
    return res.status(202).send({
      success: true,
      message: "Model deleted successfully",
      data: updatedBrand,
    });
  } catch (error) {
    console.error(`Delete Model Controller Error: ${error.message}`);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};

// ================= ORDERS
function getDateRange(dateStr) {
  const start = new Date(dateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 1); // Get the next day
  return { start, end };
}

const adminGetAllOrdersController = async (req, res) => {
  try {

    const page = parseInt(req.query.page) - 1 || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    let sort = req.query.sort || "createdAt";
    const { date } = req.query;
    let filter = {};

    if (date) {
      // If date is provided, filter by that date
      const { start, end } = getDateRange(date);
      filter.createdAt = { $gte: start, $lt: end };
    }

    filter.email = { $regex: search, $options: 'i' }; // case-insensitive search

    req.query.sort ? (sort = req.query.sort.split(",")) : (sort = [sort]);

    let sortBy = {};
    if (sort[1]){
      sortBy[sort[0]] = sort[1];
    } else {
      sortBy[sort[0]] = "asc";
    }
     
    const orders = await orderModel.find(filter)
      .sort(sortBy)
      .skip(page * limit)
      .limit(limit);

    const total = await orderModel.countDocuments(filter);

    if (!orders || orders.length === 0) {
      return res
        .status(200)
        .send({ success: false, message: "No Orders Found" });
    }

    const totalAmount = await orderModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $toDouble: "$amount" } }, // Convert "price" to double
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
        },
      },
    ]);
    return res.status(201).send({
      success: true,
      total,
      page: page + 1,
      limit,
      date,
      sort,
      message: "All Orders Fetched Success",
      data: orders,
      totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
    });
  } catch (error) {
    console.error("Error in adminGetAllOrdersController:", error);
    res.status(500).send({
      success: false,
      message: `Admin Get All Order Ctrl ${error.message}`,
    });
  }
};

const adminUpdateOrderController = async (req, res) => {
  try {
    const order = await orderModel.findOne({
      _id: req.body.id,
    });
    if (!order) {
      return res
        .status(200)
        .send({ success: false, message: "No Order Found" });
    }
    const updateOrder = await orderModel.findOneAndUpdate(
      {
        _id: req.body.id,
      },
      { $set: { status: req.body.status } },
      { new: true }
    );
    if (!updateOrder) {
      return res.status(201).send({
        success: false,
        message: "Failed to update the order",
      });
    }
    //! send mail
    const email = order.email;
    const subject = "Order Completed Successfully!";
    const msg = `Your order has been successfully completed. Please login to see - www.topupplayground.com`;
    await sendMail(email, subject, "", msg);

    return res.status(202).send({
      success: true,
      message: "Order updated successfullt",
      data: updateOrder,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Admin Get All Order Ctrl ${error.message}`,
    });
  }
};

const getShippingChargeController = async (req, res) => {
  try {
    const shipping = await offerModel.find({});
    if (!shipping) {
      return res.status(200).send({
        success: false,
        message: "No Shipping Found",
      });
    }
    return res.status(201).send({
      success: true,
      message: "Shipping Fetched Succss",
      data: shipping,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Shipping Charge Ctrl ${error.message}`,
    });
  }
};

const shippingChargeController = async (req, res) => {
  try {
    const newShippingCharge = req.body.shipping; // Adjust this based on your actual data structure
    const existingShipping = await offerModel.findOne();
    if (existingShipping) {
      await offerModel.updateOne({}, { shippingCharge: newShippingCharge });
    } else {
      await offerModel.create({ shippingCharge: newShippingCharge });
    }
    res.status(200).send({
      success: true,
      message: "Shipping charge updated successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Shipping Charge Ctrl ${error.message}`,
    });
  }
};

const addCouponController = async (req, res) => {
  try {
    const { name, discount } = req.body;

    // Check if the coupon with the same name already exists
    const existingCoupon = await offerModel.findOne({
      "coupons.name": name,
    });

    if (existingCoupon) {
      return res.status(200).send({
        success: false,
        message: "Coupon with the same name already exists",
      });
    }

    // If the coupon doesn't exist, add it to the coupons array
    const result = await offerModel.updateOne(
      {},
      {
        $push: {
          coupons: {
            name: name,
            discount: discount,
          },
        },
      }
    );
    if (result.modifiedCount > 0) {
      res.status(201).send({
        success: true,
        message: "Coupon added successfully",
      });
    } else {
      res.status(202).send({
        success: false,
        message: "Failed to add the coupon",
      });
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Coupon Ctrl ${error.message}`,
    });
  }
};

const deleteCouponController = async (req, res) => {
  try {
    const { name } = req.body;

    // Check if the coupon with the specified name exists
    const existingCoupon = await offerModel.findOne({
      "coupons.name": name,
    });

    if (!existingCoupon) {
      return res.status(404).send({
        success: false,
        message: "Coupon not found",
      });
    }

    // If the coupon exists, remove it from the coupons array
    const result = await offerModel.updateOne(
      {},
      {
        $pull: {
          coupons: { name: name },
        },
      }
    );

    // Check if the update operation was successful
    if (result.modifiedCount > 0) {
      res.status(200).send({
        success: true,
        message: "Coupon deleted successfully",
      });
    } else {
      res.status(500).send({
        success: false,
        message: "Failed to delete the coupon",
      });
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Delete Coupon Ctrl ${error.message}`,
    });
  }
};

const getAllQueries = async (req, res) => {
  try {
    const queries = await contactModel.find({});
    if (queries.length === 0) {
      return res.status(200).send({
        success: false,
        message: "No Queries Found",
      });
    }
    return res.status(201).send({
      success: true,
      message: "Queries fetched success",
      data: queries,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Get All Queries Ctrl ${error.message}`,
    });
  }
};

const seenQueryController = async (req, res) => {
  try {
    const queries = await contactModel.findOne({ _id: req.body.id });
    if (!queries) {
      return res.status(200).send({
        success: false,
        message: "No Queries Found",
      });
    }
    const updateQuery = await contactModel.findOneAndUpdate(
      {
        _id: req.body.id,
      },
      { $set: { status: "seen" } },
      { new: true }
    );
    return res.status(201).send({
      success: true,
      message: "Query updated success",
      data: updateQuery,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Get All Queries Ctrl ${error.message}`,
    });
  }
};

const getAllPaymentsController = async (req, res) => {
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
};

const updateWebsiteController = async (req, res) => {
  try {
    const admin = await websiteModel.findOne({
      email: "admin@gmail.com",
    });
    if (!admin) {
      return res.status(201).send({
        success: false,
        message: "No Access",
      });
    }
    const updatedWebsiteStatus = !admin.website;
    const updateWebsite = await websiteModel.findOneAndUpdate(
      { email: "admin@gmail.com" },
      { $set: { website: updatedWebsiteStatus } },
      { new: true }
    );
    // Check if website update failed
    if (!updateWebsite) {
      return res.status(500).send({
        success: false,
        message: "Failed to update website",
      });
    }
    // Website updated successfully
    return res.status(200).send({
      success: true,
      message: "Website updated",
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: `Get All Queries Ctrl ${error.message}`,
    });
  }
};

const getWebsiteContoller = async (req, res) => {
  try {
    const website = await websiteModel.findOne({ email: "admin@gmail.com" });
    if (!website) {
      return res.status(201).send({ success: false, message: "Website Error" });
    }
    return res
      .status(200)
      .send({ success: true, message: "Website Fetched", data: website });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUserController,
  getUserController,
  deleteUserController,
  editUserController,
  sendMailToIncompleteUsersController,
  addBrandController,
  getAllBrandContoller,
  addModelController,
  deleteModelController,
  adminGetAllOrdersController,
  adminUpdateOrderController,
  getShippingChargeController,
  shippingChargeController,
  addCouponController,
  deleteCouponController,
  getAllQueries,
  seenQueryController,
  getAllPaymentsController,
  getWebsiteContoller,
  updateWebsiteController,
};
