const express = require("express");

const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount
} = require("../controllers/notificationController");

const router = express.Router();


// =====================================================
// GET MY NOTIFICATIONS
//
// GET /api/notifications?user_id=&unread_only=true
// =====================================================

router.get(
    "/",
    getNotifications
);


// =====================================================
// UNREAD COUNT
//
// GET /api/notifications/unread-count?user_id=
// =====================================================

router.get(
    "/unread-count",
    getUnreadCount
);


// =====================================================
// MARK ALL AS READ
//
// PUT /api/notifications/read-all
// =====================================================

router.put(
    "/read-all",
    markAllAsRead
);


// =====================================================
// MARK ONE AS READ
//
// PUT /api/notifications/:id/read
// =====================================================

router.put(
    "/:id/read",
    markAsRead
);


// =====================================================
// DELETE A NOTIFICATION
//
// DELETE /api/notifications/:id
// =====================================================

router.delete(
    "/:id",
    deleteNotification
);


module.exports = router;
