const express = require("express");

const {
    createOrder,
    getFarmerOrders,
    getBuyerOrders,
    updateOrderStatus,
    updateOrderStatusByBuyer,
    getOrderById,
    getRecommendedCrops
} = require("../controllers/orderController");

const router = express.Router();


// =====================================================
// CREATE NEW ORDER
// POST /api/orders
// =====================================================

router.post(
    "/",
    createOrder
);


// =====================================================
// GET ALL ORDERS FOR A FARMER
// GET /api/orders/farmer/:farmerId
// =====================================================

router.get(
    "/farmer/:farmerId",
    getFarmerOrders
);


// =====================================================
// GET ALL ORDERS FOR A BUYER
// GET /api/orders/buyer/:buyerId
// =====================================================

router.get(
    "/buyer/:buyerId",
    getBuyerOrders
);


// =====================================================
// GET RECOMMENDED CROPS FOR A BUYER
// GET /api/orders/recommendations/:buyerId
// =====================================================

router.get(
    "/recommendations/:buyerId",
    getRecommendedCrops
);


// =====================================================
// GET SINGLE ORDER
// GET /api/orders/:orderId
// =====================================================

router.get(
    "/:orderId",
    getOrderById
);


// =====================================================
// UPDATE ORDER STATUS
// PUT /api/orders/:orderId/status
// =====================================================

router.put(
    "/:orderId/status",
    updateOrderStatus
);


// =====================================================
// UPDATE ORDER STATUS (BUYER: cancel / confirm receipt)
// PUT /api/orders/:orderId/buyer-status
// =====================================================

router.put(
    "/:orderId/buyer-status",
    updateOrderStatusByBuyer
);


module.exports = router;