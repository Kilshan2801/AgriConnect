const db = require("../db");
const { createNotification } = require("./notificationController");


/*
=========================================================
CREATE NEW ORDER
=========================================================

Only BUYERS can place orders.

Buyer sends:

{
    buyer_id,
    crop_id,
    quantity,
    delivery_address
}

Farmer ID and price are obtained from the crop itself.
Total amount is calculated by the backend.
=========================================================
*/

const createOrder = (req, res) => {

    const {
        buyer_id,
        crop_id,
        quantity,
        delivery_address
    } = req.body;


    // =====================================================
    // VALIDATE REQUIRED FIELDS
    // =====================================================

    if (
        !buyer_id ||
        !crop_id ||
        !quantity ||
        !delivery_address
    ) {

        return res.status(400).json({

            success: false,

            message:
                "All required fields must be provided."

        });

    }


    // =====================================================
    // VALIDATE QUANTITY
    // =====================================================

    if (
        Number(quantity) <= 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Quantity must be greater than 0."

        });

    }


    // =====================================================
    // CHECK BUYER ROLE
    // =====================================================

    const roleQuery = `

        SELECT role

        FROM user_roles

        WHERE user_id = ?

        AND role = 'buyer'

        LIMIT 1

    `;


    db.query(
        roleQuery,
        [buyer_id],
        (roleError, roleResults) => {

            if (roleError) {

                console.error(
                    "Buyer role lookup error:",
                    roleError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to verify user role."

                });

            }


            if (
                roleResults.length === 0
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only buyers can place orders."

                });

            }


            // =================================================
            // GET CROP
            // =================================================

            const cropQuery = `

                SELECT

                    id,

                    farmer_id,

                    crop_name,

                    specific_name,

                    price_per_kg,

                    quantity

                FROM crops

                WHERE id = ?

            `;


            db.query(
                cropQuery,
                [crop_id],
                (cropError, cropResults) => {

                    if (cropError) {

                        console.error(
                            "Crop lookup error:",
                            cropError
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Failed to find crop."

                        });

                    }


                    if (
                        cropResults.length === 0
                    ) {

                        return res.status(404).json({

                            success: false,

                            message:
                                "Crop not found."

                        });

                    }


                    const crop =
                        cropResults[0];


                    // =================================================
                    // PREVENT BUYER FROM ORDERING THEIR OWN CROP
                    // =================================================

                    if (
                        Number(buyer_id) ===
                        Number(crop.farmer_id)
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "You cannot order your own crop."

                        });

                    }


                    const orderQuantity =
                        Number(
                            quantity
                        );


                    // =================================================
                    // CHECK AVAILABLE STOCK
                    // =================================================

                    if (
                        orderQuantity >
                        Number(crop.quantity)
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                `Only ${crop.quantity} kg of ${crop.crop_name} is available.`

                        });

                    }


                    const pricePerKg =
                        Number(
                            crop.price_per_kg
                        );


                    const totalAmount =
                        pricePerKg *
                        orderQuantity;


                    // =================================================
                    // CREATE ORDER
                    // =================================================

                    const insertQuery = `

                        INSERT INTO orders
                        (
                            buyer_id,
                            farmer_id,
                            crop_id,
                            quantity,
                            price_per_kg,
                            total_amount,
                            delivery_address,
                            status
                        )

                        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')

                    `;


                    db.query(
                        insertQuery,
                        [

                            buyer_id,

                            crop.farmer_id,

                            crop.id,

                            orderQuantity,

                            pricePerKg,

                            totalAmount,

                            delivery_address

                        ],
                        (insertError, result) => {

                            if (insertError) {

                                console.error(
                                    "Create order error:",
                                    insertError
                                );

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "Failed to create order."

                                });

                            }


                            // Reserve the stock now that the order exists.
                            db.query(
                                `UPDATE crops SET quantity = quantity - ? WHERE id = ?`,
                                [orderQuantity, crop.id],
                                (stockError) => {

                                    if (stockError) {

                                        console.error(
                                            "Failed to reduce crop stock:",
                                            stockError
                                        );

                                    }

                                }
                            );


                            // Fire-and-forget: notify the farmer a new order came in.
                            createNotification({
                                userId: crop.farmer_id,
                                type: "order",
                                title: "New order received",
                                message: `You have a new order for ${crop.crop_name} (${orderQuantity} kg).`,
                                relatedType: "order",
                                relatedId: result.insertId
                            });


                            return res.status(201).json({

                                success: true,

                                message:
                                    "Order placed successfully!",

                                order: {

                                    id:
                                        result.insertId,

                                    buyer_id:
                                        Number(
                                            buyer_id
                                        ),

                                    farmer_id:
                                        crop.farmer_id,

                                    crop_id:
                                        crop.id,

                                    crop_name:
                                        crop.crop_name,

                                    specific_name:
                                        crop.specific_name,

                                    quantity:
                                        orderQuantity,

                                    price_per_kg:
                                        pricePerKg,

                                    total_amount:
                                        totalAmount,

                                    delivery_address:
                                        delivery_address,

                                    status:
                                        "pending"

                                }

                            });

                        }
                    );

                }
            );

        }
    );

};


/*
=========================================================
CHECK FARMER ROLE
=========================================================
*/

const checkFarmerRole = (
    farmerId,
    callback
) => {

    const query = `

        SELECT role

        FROM user_roles

        WHERE user_id = ?

        AND role = 'farmer'

        LIMIT 1

    `;


    db.query(
        query,
        [farmerId],
        (error, results) => {

            if (error) {

                return callback(
                    error,
                    false
                );

            }


            callback(
                null,
                results.length > 0
            );

        }
    );

};


/*
=========================================================
GET FARMER ORDERS
=========================================================

Returns only orders belonging to the specified farmer.
=========================================================
*/

const getFarmerOrders = (req, res) => {

    const farmerId =
        req.params.farmerId;


    if (!farmerId) {

        return res.status(400).json({

            success: false,

            message:
                "Farmer ID is required."

        });

    }


    checkFarmerRole(
        farmerId,
        (roleError, isFarmer) => {

            if (roleError) {

                console.error(
                    "Farmer role lookup error:",
                    roleError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to verify farmer role."

                });

            }


            if (!isFarmer) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only farmers can access farmer orders."

                });

            }


            const query = `

                SELECT

                    o.id AS order_id,

                    o.buyer_id,

                    o.farmer_id,

                    o.crop_id,

                    o.quantity,

                    o.price_per_kg,

                    o.total_amount,

                    o.delivery_address,

                    o.status,

                    o.created_at,

                    c.crop_name,

                    c.specific_name,

                    (SELECT image_path FROM crop_images WHERE crop_id = c.id ORDER BY id ASC LIMIT 1) AS image,

                    u.first_name AS buyer_first_name,

                    u.last_name AS buyer_last_name,

                    u.phone AS buyer_phone

                FROM orders o

                INNER JOIN crops c
                    ON o.crop_id = c.id

                INNER JOIN users u
                    ON o.buyer_id = u.id

                WHERE o.farmer_id = ?

                ORDER BY o.created_at DESC

            `;


            db.query(
                query,
                [farmerId],
                (error, results) => {

                    if (error) {

                        console.error(
                            "Get farmer orders error:",
                            error
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Failed to load farmer orders."

                        });

                    }


                    return res.status(200).json({

                        success: true,

                        orders:
                            results

                    });

                }
            );

        }
    );

};


/*
=========================================================
GET BUYER ORDERS
=========================================================
*/

const getBuyerOrders = (req, res) => {

    const buyerId =
        req.params.buyerId;


    if (!buyerId) {

        return res.status(400).json({

            success: false,

            message:
                "Buyer ID is required."

        });

    }


    const query = `

        SELECT

            o.id AS order_id,

            o.buyer_id,

            o.farmer_id,

            o.crop_id,

            o.quantity,

            o.price_per_kg,

            o.total_amount,

            o.delivery_address,

            o.status,

            o.created_at,

            c.crop_name,

            c.specific_name,

            (SELECT image_path FROM crop_images WHERE crop_id = c.id ORDER BY id ASC LIMIT 1) AS image,

            u.first_name AS farmer_first_name,

            u.last_name AS farmer_last_name,

            u.phone AS farmer_phone

        FROM orders o

        INNER JOIN crops c
            ON o.crop_id = c.id

        INNER JOIN users u
            ON o.farmer_id = u.id

        WHERE o.buyer_id = ?

        ORDER BY o.created_at DESC

    `;


    db.query(
        query,
        [buyerId],
        (error, results) => {

            if (error) {

                console.error(
                    "Get buyer orders error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load buyer orders."

                });

            }


            return res.status(200).json({

                success: true,

                orders:
                    results

            });

        }
    );

};


/*
=========================================================
UPDATE ORDER STATUS
=========================================================

Only the FARMER who owns the order can update it.

Allowed statuses:

pending
accepted
rejected
completed
cancelled

=========================================================
*/

const updateOrderStatus = (req, res) => {

    const orderId =
        req.params.orderId;


    const {
        status,
        farmer_id
    } = req.body;


    const allowedStatuses = [

        "pending",

        "accepted",

        "rejected",

        "delivered",

        "completed",

        "cancelled"

    ];


    if (!orderId) {

        return res.status(400).json({

            success: false,

            message:
                "Order ID is required."

        });

    }


    if (!farmer_id) {

        return res.status(400).json({

            success: false,

            message:
                "Farmer ID is required."

        });

    }


    if (
        !status ||
        !allowedStatuses.includes(status)
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid order status."

        });

    }


    // =====================================================
    // CHECK FARMER ROLE
    // =====================================================

    checkFarmerRole(
        farmer_id,
        (roleError, isFarmer) => {

            if (roleError) {

                console.error(
                    "Farmer role verification error:",
                    roleError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to verify farmer."

                });

            }


            if (!isFarmer) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only farmers can update order status."

                });

            }


            // =================================================
            // GET CURRENT ORDER
            // =================================================

            const orderQuery = `

                SELECT

                    id,

                    farmer_id,

                    buyer_id,

                    crop_id,

                    quantity,

                    status

                FROM orders

                WHERE id = ?

                LIMIT 1

            `;


            db.query(
                orderQuery,
                [orderId],
                (orderError, orderResults) => {

                    if (orderError) {

                        console.error(
                            "Order lookup error:",
                            orderError
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Failed to find order."

                        });

                    }


                    if (
                        orderResults.length === 0
                    ) {

                        return res.status(404).json({

                            success: false,

                            message:
                                "Order not found."

                        });

                    }


                    const order =
                        orderResults[0];


                    // =================================================
                    // CHECK ORDER OWNERSHIP
                    // =================================================

                    if (
                        Number(order.farmer_id) !==
                        Number(farmer_id)
                    ) {

                        return res.status(403).json({

                            success: false,

                            message:
                                "You can only update orders belonging to you."

                        });

                    }


                    // =================================================
                    // VALIDATE STATUS TRANSITIONS
                    // =================================================

                    const currentStatus =
                        order.status;


                    if (
                        currentStatus === "rejected" &&
                        status !== "rejected"
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "A rejected order cannot be changed."

                        });

                    }


                    if (
                        currentStatus === "completed" &&
                        status !== "completed"
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "A completed order cannot be changed."

                        });

                    }


                    if (
                        currentStatus === "delivered" &&
                        status !== "delivered"
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "This order has been delivered and is awaiting the buyer's confirmation."

                        });

                    }


                    if (
                        currentStatus === "cancelled" &&
                        status !== "cancelled"
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "A cancelled order cannot be changed."

                        });

                    }


                    /*
                    -------------------------------------------------
                    Farmer workflow

                    pending
                       ↓
                    accepted
                       ↓
                    completed

                    pending
                       ↓
                    rejected
                    -------------------------------------------------
                    */


                    if (
                        currentStatus === "pending"
                    ) {

                        if (
                            status !== "accepted" &&
                            status !== "rejected" &&
                            status !== "pending"
                        ) {

                            return res.status(400).json({

                                success: false,

                                message:
                                    "A pending order can only be accepted or rejected."

                            });

                        }

                    }


                    if (
                        currentStatus === "accepted"
                    ) {

                        if (
                            status !== "delivered" &&
                            status !== "accepted"
                        ) {

                            return res.status(400).json({

                                success: false,

                                message:
                                    "An accepted order can only be marked as delivered."

                            });

                        }

                    }


                    // =================================================
                    // UPDATE ORDER
                    // =================================================

                    const updateQuery = `

                        UPDATE orders

                        SET status = ?

                        WHERE id = ?

                        AND farmer_id = ?

                    `;


                    db.query(
                        updateQuery,
                        [
                            status,
                            orderId,
                            farmer_id
                        ],
                        (updateError, result) => {

                            if (updateError) {

                                console.error(
                                    "Update order status error:",
                                    updateError
                                );

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "Failed to update order status."

                                });

                            }


                            if (
                                result.affectedRows === 0
                            ) {

                                return res.status(404).json({

                                    success: false,

                                    message:
                                        "Order was not updated."

                                });

                            }


                            // Restore the reserved stock if the
                            // farmer rejected the order.
                            if (status === "rejected") {

                                db.query(
                                    `UPDATE crops SET quantity = quantity + ? WHERE id = ?`,
                                    [order.quantity, order.crop_id],
                                    (stockError) => {

                                        if (stockError) {

                                            console.error(
                                                "Failed to restore crop stock:",
                                                stockError
                                            );

                                        }

                                    }
                                );

                            }


                            // Fire-and-forget: notify the buyer their order status changed.
                            const buyerStatusMessages = {
                                accepted: `Your order #${orderId} has been accepted by the farmer.`,
                                rejected: `Your order #${orderId} was rejected by the farmer.`,
                                delivered: `Your order #${orderId} is out for delivery.`
                            };

                            createNotification({
                                userId: order.buyer_id,
                                type: "order",
                                title: "Order status updated",
                                message: buyerStatusMessages[status] || `Your order #${orderId} is now ${status}.`,
                                relatedType: "order",
                                relatedId: Number(orderId)
                            });


                            return res.status(200).json({

                                success: true,

                                message:
                                    `Order ${status} successfully.`,

                                status:
                                    status

                            });

                        }
                    );

                }
            );

        }
    );

};


/*
=========================================================
UPDATE ORDER STATUS (BUYER)

Buyers may:
  - cancel a "pending" order (before the farmer responds)
  - confirm receipt of a "delivered" order (-> completed)

Any other transition is rejected - buyers cannot accept,
reject, or mark their own order delivered.
=========================================================
*/

const updateOrderStatusByBuyer = (req, res) => {

    const orderId =
        req.params.orderId;

    const {
        status,
        buyer_id
    } = req.body;

    const allowedBuyerStatuses = [
        "cancelled",
        "completed"
    ];

    if (!orderId) {

        return res.status(400).json({
            success: false,
            message: "Order ID is required."
        });

    }

    if (!buyer_id) {

        return res.status(400).json({
            success: false,
            message: "Buyer ID is required."
        });

    }

    if (
        !status ||
        !allowedBuyerStatuses.includes(status)
    ) {

        return res.status(400).json({
            success: false,
            message: "Invalid order status."
        });

    }

    const orderQuery = `
        SELECT id, farmer_id, buyer_id, crop_id, quantity, status
        FROM orders
        WHERE id = ?
        LIMIT 1
    `;

    db.query(
        orderQuery,
        [orderId],
        (orderError, orderResults) => {

            if (orderError) {

                console.error(
                    "Order lookup error:",
                    orderError
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to find order."
                });

            }

            if (orderResults.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Order not found."
                });

            }

            const order =
                orderResults[0];

            if (
                Number(order.buyer_id) !==
                Number(buyer_id)
            ) {

                return res.status(403).json({
                    success: false,
                    message: "You can only update your own orders."
                });

            }

            if (
                status === "cancelled" &&
                order.status !== "pending"
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Only a pending order can be cancelled. Once a farmer accepts it, it can no longer be cancelled."
                });

            }

            if (
                status === "completed" &&
                order.status !== "delivered"
            ) {

                return res.status(400).json({
                    success: false,
                    message: "You can only confirm receipt once the order has been delivered."
                });

            }

            const updateQuery = `
                UPDATE orders
                SET status = ?
                WHERE id = ?
                AND buyer_id = ?
            `;

            db.query(
                updateQuery,
                [status, orderId, buyer_id],
                (updateError, result) => {

                    if (updateError) {

                        console.error(
                            "Update order status (buyer) error:",
                            updateError
                        );

                        return res.status(500).json({
                            success: false,
                            message: "Failed to update order status."
                        });

                    }

                    if (result.affectedRows === 0) {

                        return res.status(404).json({
                            success: false,
                            message: "Order was not updated."
                        });

                    }

                    // Restore the reserved stock if the
                    // buyer cancelled the order.
                    if (status === "cancelled") {

                        db.query(
                            `UPDATE crops SET quantity = quantity + ? WHERE id = ?`,
                            [order.quantity, order.crop_id],
                            (stockError) => {

                                if (stockError) {

                                    console.error(
                                        "Failed to restore crop stock:",
                                        stockError
                                    );

                                }

                            }
                        );

                    }

                    // Fire-and-forget: notify the farmer.
                    const farmerStatusMessages = {
                        cancelled: `Order #${orderId} was cancelled by the buyer.`,
                        completed: `The buyer confirmed receipt of order #${orderId}. Delivered successfully.`
                    };

                    createNotification({
                        userId: order.farmer_id,
                        type: "order",
                        title: "Order status updated",
                        message: farmerStatusMessages[status],
                        relatedType: "order",
                        relatedId: Number(orderId)
                    });

                    return res.status(200).json({

                        success: true,

                        message:
                            status === "cancelled"
                                ? "Order cancelled successfully."
                                : "Order marked as received. Thank you!",

                        status: status

                    });

                }
            );

        }
    );

};


/*
=========================================================
GET SINGLE ORDER
=========================================================
*/

const getOrderById = (req, res) => {

    const orderId =
        req.params.orderId;


    if (!orderId) {

        return res.status(400).json({

            success: false,

            message:
                "Order ID is required."

        });

    }


    const query = `

        SELECT

            o.id AS order_id,

            o.buyer_id,

            o.farmer_id,

            o.crop_id,

            o.quantity,

            o.price_per_kg,

            o.total_amount,

            o.delivery_address,

            o.status,

            o.created_at,

            c.crop_name,

            c.specific_name,

            c.harvested_date,

            c.price_per_kg AS crop_current_price,

            (SELECT image_path FROM crop_images WHERE crop_id = c.id ORDER BY id ASC LIMIT 1) AS image,

            c.description,

            buyer.first_name
                AS buyer_first_name,

            buyer.last_name
                AS buyer_last_name,

            buyer.phone
                AS buyer_phone,

            farmer.first_name
                AS farmer_first_name,

            farmer.last_name
                AS farmer_last_name,

            farmer.phone
                AS farmer_phone

        FROM orders o

        INNER JOIN crops c
            ON o.crop_id = c.id

        INNER JOIN users buyer
            ON o.buyer_id = buyer.id

        INNER JOIN users farmer
            ON o.farmer_id = farmer.id

        WHERE o.id = ?

    `;


    db.query(
        query,
        [orderId],
        (error, results) => {

            if (error) {

                console.error(
                    "Get order error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load order."

                });

            }


            if (
                results.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found."

                });

            }


            return res.status(200).json({

                success: true,

                order:
                    results[0]

            });

        }
    );

};


/*
=========================================================
GET RECOMMENDED CROPS FOR A BUYER

Shows the 4 most recently listed crops across all farmers,
newest first - a simple "just listed" feed rather than a
personalized recommendation.
=========================================================
*/

const getRecommendedCrops = async (req, res) => {

    const buyerId = req.params.buyerId;

    if (!buyerId) {
        return res.status(400).json({ success: false, message: "Buyer ID is required." });
    }

    try {

        const [rows] = await db.promise().query(
            `SELECT
                cr.id, cr.crop_name, cr.specific_name, cr.price_per_kg,
                cr.quantity, cr.farmer_id, cr.created_at,
                COALESCE(ci.image_path, cr.image) AS image,
                u.first_name, u.last_name,
                fp.district
             FROM crops cr
             INNER JOIN users u ON cr.farmer_id = u.id
             LEFT JOIN farmer_profiles fp ON fp.user_id = u.id
             INNER JOIN user_roles ur ON ur.user_id = cr.farmer_id AND ur.role = 'farmer'
             LEFT JOIN crop_images ci ON ci.crop_id = cr.id AND ci.id = (
                SELECT MIN(id) FROM crop_images WHERE crop_id = cr.id
             )
             WHERE u.is_active = 1
               AND u.removed_at IS NULL
               AND cr.quantity > 0
             ORDER BY cr.created_at DESC
             LIMIT 4`
        );

        return res.json({
            success: true,
            recommendations: rows
        });

    } catch (error) {

        console.error("getRecommendedCrops error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load recommendations."
        });

    }

};


/*
=========================================================
EXPORT CONTROLLERS
=========================================================
*/

module.exports = {

    createOrder,

    getFarmerOrders,

    getBuyerOrders,

    updateOrderStatus,

    updateOrderStatusByBuyer,

    getOrderById,

    getRecommendedCrops

};