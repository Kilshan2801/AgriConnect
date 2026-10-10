const db = require("../db");

// =====================================================
// HISTORY
// =====================================================
//
// Rather than a separate "history" table duplicating data,
// history is a read-only view over records that already
// reached a final state in the tables that already exist:
// completed/cancelled/rejected orders & rentals, and
// resolved/rejected reports. This avoids storing the same
// fact twice and keeps a single source of truth.
// =====================================================

function query(sql, params) {
    return db.promise().query(sql, params);
}

const FINAL_ORDER_STATUSES = ["completed", "cancelled", "rejected"];
const FINAL_RENTAL_STATUSES = ["completed", "cancelled", "rejected"];
const FINAL_REPORT_STATUSES = ["resolved", "rejected"];


// =====================================================
// MY HISTORY (per logged-in user)
//
// GET /api/history?user_id=&role=farmer|buyer|expert|equipment_provider
// =====================================================

exports.getMyHistory = async (req, res) => {

    try {

        const userId = req.query.user_id;
        const role = req.query.role;

        if (!userId || !role) {
            return res.status(400).json({ success: false, message: "user_id and role are required." });
        }

        const [reports] = await query(
            `SELECT id, report_type, subject, status, admin_note, created_at, resolved_at
             FROM reports
             WHERE reporter_id = ? AND status IN (?, ?)
             ORDER BY resolved_at DESC`,
            [userId, ...FINAL_REPORT_STATUSES]
        );

        let orders = [];
        let rentals = [];
        let consultations = [];

        if (role === "farmer") {

            [orders] = await query(
                `SELECT o.id, o.crop_id, c.crop_name, o.quantity, o.total_amount, o.status, o.created_at
                 FROM orders o
                 INNER JOIN crops c ON c.id = o.crop_id
                 WHERE o.farmer_id = ? AND o.status IN (?, ?, ?)
                 ORDER BY o.created_at DESC`,
                [userId, ...FINAL_ORDER_STATUSES]
            );

            [rentals] = await query(
                `SELECT r.id, r.equipment_id, e.equipment_name, r.total_amount, r.status, r.created_at
                 FROM rentals r
                 INNER JOIN equipment e ON e.id = r.equipment_id
                 WHERE r.renter_id = ? AND r.status IN (?, ?, ?)
                 ORDER BY r.created_at DESC`,
                [userId, ...FINAL_RENTAL_STATUSES]
            );

        } else if (role === "buyer") {

            [orders] = await query(
                `SELECT o.id, o.crop_id, c.crop_name, o.quantity, o.total_amount, o.status, o.created_at
                 FROM orders o
                 INNER JOIN crops c ON c.id = o.crop_id
                 WHERE o.buyer_id = ? AND o.status IN (?, ?, ?)
                 ORDER BY o.created_at DESC`,
                [userId, ...FINAL_ORDER_STATUSES]
            );

        } else if (role === "equipment_provider") {

            // rentals.provider_id stores equipment_provider_profiles.id,
            // not users.id - see messageController.js for the same note.
            [rentals] = await query(
                `SELECT r.id, r.equipment_id, e.equipment_name, r.total_amount, r.status, r.created_at
                 FROM rentals r
                 INNER JOIN equipment e ON e.id = r.equipment_id
                 INNER JOIN equipment_provider_profiles epp ON epp.id = r.provider_id
                 WHERE epp.user_id = ? AND r.status IN (?, ?, ?)
                 ORDER BY r.created_at DESC`,
                [userId, ...FINAL_RENTAL_STATUSES]
            );

        }
        // role === "expert": reports, plus completed consultations below.

        if (role === "expert") {

            [consultations] = await query(
                `SELECT
                    c.id,
                    c.completed_at,
                    c.created_at,
                    u.first_name,
                    u.last_name,
                    (SELECT message_text FROM messages WHERE conversation_id = c.id ORDER BY created_at ASC LIMIT 1) AS first_message,
                    (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at ASC LIMIT 1) AS first_message_at,
                    (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at
                 FROM conversations c
                 INNER JOIN users u ON u.id = CASE WHEN c.user_one_id = ? THEN c.user_two_id ELSE c.user_one_id END
                 WHERE (c.user_one_id = ? OR c.user_two_id = ?)
                 AND c.context_type = 'consultation'
                 AND c.completed_at IS NOT NULL
                 ORDER BY c.completed_at DESC`,
                [userId, userId, userId]
            );

        }

        return res.json({
            success: true,
            orders,
            rentals,
            reports,
            consultations
        });

    } catch (err) {

        console.error("getMyHistory error:", err);
        return res.status(500).json({ success: false, message: "Failed to load history." });

    }

};


// =====================================================
// ADMIN HISTORY
//
// GET /api/admin/history
//
// Rejected registrations, resolved/rejected reports, and
// removed users - the admin audit trail.
// =====================================================

exports.getAdminHistory = async (req, res) => {

    try {

        const [rejectedRegistrations] = await query(
            `SELECT r.id, r.registration_type, r.status, r.review_note, r.created_at, r.reviewed_at,
                    u.first_name, u.last_name, u.email, u.phone
             FROM registrations r
             INNER JOIN users u ON u.id = r.user_id
             WHERE r.status = 'rejected'
             ORDER BY r.reviewed_at DESC`
        );

        const [resolvedReports] = await query(
            `SELECT rp.id, rp.report_type, rp.subject, rp.status, rp.admin_note, rp.created_at, rp.resolved_at,
                    u.first_name, u.last_name, u.email, u.phone,
                    COALESCE(
                        (SELECT role FROM user_roles WHERE user_id = u.id AND role != 'buyer' LIMIT 1),
                        'buyer'
                    ) AS reporter_role
             FROM reports rp
             INNER JOIN users u ON u.id = rp.reporter_id
             WHERE rp.status IN ('resolved', 'rejected')
             ORDER BY rp.resolved_at DESC`
        );

        const [removedUsers] = await query(
            `SELECT id, first_name, last_name, email, phone, removed_at, removed_reason,
                    COALESCE(
                        (SELECT role FROM user_roles WHERE user_id = users.id AND role != 'buyer' LIMIT 1),
                        'buyer'
                    ) AS role
             FROM users
             WHERE removed_at IS NOT NULL
             ORDER BY removed_at DESC`
        );

        return res.json({
            success: true,
            rejected_registrations: rejectedRegistrations,
            resolved_reports: resolvedReports,
            removed_users: removedUsers
        });

    } catch (err) {

        console.error("getAdminHistory error:", err);
        return res.status(500).json({ success: false, message: "Failed to load admin history." });

    }

};
