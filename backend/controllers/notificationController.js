const db = require("../db");

// =====================================================
// NOTIFICATIONS
// =====================================================
//
// One `notifications` table serves all five roles. Rows
// are created from other controllers via the exported
// `createNotification()` helper (fire-and-forget - a
// notification failing to insert must never fail the
// action that triggered it, e.g. placing an order).
//
// NOTE ON ADMIN:
// There is no admin user row in `users` (registerUser
// blocks role === "admin" and admin login is a hardcoded
// client-side check with a synthetic "admin-001" id - see
// login.html). So admin has nothing to hold a user_id FK
// against, and this table intentionally does NOT try to
// notify "admin". The Admin Dashboard/Registrations/Reports
// pages already show live pending counts by querying those
// tables directly, which is the correct source of truth for
// an account that isn't really a row in the database.
// =====================================================

function query(sql, params) {
    return db.promise().query(sql, params);
}


// =====================================================
// CREATE NOTIFICATION (internal helper, used by other
// controllers - not an HTTP endpoint)
//
// Always resolves; logs and swallows errors so a failed
// notification insert never breaks the caller's main flow.
// =====================================================

async function createNotification({ userId, type, title, message, relatedType = null, relatedId = null }) {

    try {

        if (!userId || !type || !title || !message) {
            console.error("createNotification: missing required field", { userId, type, title, message });
            return;
        }

        await query(
            `INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, type, title, message, relatedType, relatedId]
        );

    } catch (err) {

        console.error("createNotification failed:", err);

    }

}


// =====================================================
// GET MY NOTIFICATIONS
//
// GET /api/notifications?user_id=&unread_only=true
// =====================================================

exports.getNotifications = async (req, res) => {

    try {

        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const unreadOnly = req.query.unread_only === "true";

        const [rows] = await query(
            `SELECT id, type, title, message, related_type, related_id, is_read, created_at
             FROM notifications
             WHERE user_id = ?
             ${unreadOnly ? "AND is_read = 0" : ""}
             ORDER BY created_at DESC
             LIMIT 100`,
            [userId]
        );

        const [countRows] = await query(
            `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        return res.json({
            success: true,
            notifications: rows,
            unread_count: countRows[0].unread
        });

    } catch (err) {

        console.error("getNotifications error:", err);
        return res.status(500).json({ success: false, message: "Failed to load notifications." });

    }

};


// =====================================================
// MARK ONE NOTIFICATION AS READ
//
// PUT /api/notifications/:id/read
// Body: { user_id }
// =====================================================

exports.markAsRead = async (req, res) => {

    try {

        const notificationId = req.params.id;
        const userId = req.body && req.body.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const [result] = await query(
            `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
            [notificationId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }

        return res.json({ success: true, message: "Notification marked as read." });

    } catch (err) {

        console.error("markAsRead error:", err);
        return res.status(500).json({ success: false, message: "Failed to update notification." });

    }

};


// =====================================================
// MARK ALL AS READ
//
// PUT /api/notifications/read-all
// Body: { user_id }
// =====================================================

exports.markAllAsRead = async (req, res) => {

    try {

        const userId = req.body && req.body.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        await query(
            `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        return res.json({ success: true, message: "All notifications marked as read." });

    } catch (err) {

        console.error("markAllAsRead error:", err);
        return res.status(500).json({ success: false, message: "Failed to update notifications." });

    }

};


// =====================================================
// DELETE A NOTIFICATION
//
// DELETE /api/notifications/:id
// Body: { user_id }
// =====================================================

exports.deleteNotification = async (req, res) => {

    try {

        const notificationId = req.params.id;
        const userId = (req.body && req.body.user_id) || req.query.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const [result] = await query(
            `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
            [notificationId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }

        return res.json({ success: true, message: "Notification deleted." });

    } catch (err) {

        console.error("deleteNotification error:", err);
        return res.status(500).json({ success: false, message: "Failed to delete notification." });

    }

};


// =====================================================
// UNREAD COUNT (lightweight, for a badge)
//
// GET /api/notifications/unread-count?user_id=
// =====================================================

exports.getUnreadCount = async (req, res) => {

    try {

        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const [rows] = await query(
            `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        return res.json({ success: true, unread: rows[0].unread });

    } catch (err) {

        console.error("getUnreadCount error:", err);
        return res.status(500).json({ success: false, message: "Failed to load unread count." });

    }

};


// Exported separately (not an HTTP handler) so other controllers
// can trigger notifications: const { createNotification } = require("./notificationController");
exports.createNotification = createNotification;
