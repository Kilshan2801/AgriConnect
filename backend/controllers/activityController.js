const db = require("../db");

// =====================================================
// CALENDAR / FARMING ACTIVITIES
// =====================================================

function query(sql, params) {
    return db.promise().query(sql, params);
}


// =====================================================
// LIST MY ACTIVITIES
//
// GET /api/activities?user_id=&month=YYYY-MM
// =====================================================

exports.getActivities = async (req, res) => {

    try {

        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const month = req.query.month; // optional "YYYY-MM"

        const [rows] = await query(
            `SELECT id, title, description, activity_date, activity_type, status, created_at
             FROM activities
             WHERE user_id = ?
             ${month ? "AND DATE_FORMAT(activity_date, '%Y-%m') = ?" : ""}
             ORDER BY activity_date ASC`,
            month ? [userId, month] : [userId]
        );

        return res.json({ success: true, activities: rows });

    } catch (err) {

        console.error("getActivities error:", err);
        return res.status(500).json({ success: false, message: "Failed to load activities." });

    }

};


// =====================================================
// CREATE ACTIVITY
//
// POST /api/activities
// Body: { user_id, title, description?, activity_date, activity_type? }
// =====================================================

exports.createActivity = async (req, res) => {

    try {

        const { user_id, title, description, activity_date, activity_type } = req.body || {};

        if (!user_id || !title || !activity_date) {
            return res.status(400).json({
                success: false,
                message: "user_id, title and activity_date are required."
            });
        }

        const [result] = await query(
            `INSERT INTO activities (user_id, title, description, activity_date, activity_type)
             VALUES (?, ?, ?, ?, ?)`,
            [user_id, title, description || null, activity_date, activity_type || null]
        );

        const [created] = await query(
            `SELECT id, title, description, activity_date, activity_type, status, created_at
             FROM activities WHERE id = ?`,
            [result.insertId]
        );

        return res.status(201).json({ success: true, activity: created[0] });

    } catch (err) {

        console.error("createActivity error:", err);
        return res.status(500).json({ success: false, message: "Failed to create activity." });

    }

};


// =====================================================
// UPDATE ACTIVITY (edit details)
//
// PUT /api/activities/:id
// Body: { user_id, title?, description?, activity_date?, activity_type? }
// =====================================================

exports.updateActivity = async (req, res) => {

    try {

        const activityId = req.params.id;
        const { user_id, title, description, activity_date, activity_type } = req.body || {};

        if (!user_id) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const [existing] = await query(
            `SELECT * FROM activities WHERE id = ? AND user_id = ? LIMIT 1`,
            [activityId, user_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Activity not found." });
        }

        const current = existing[0];

        await query(
            `UPDATE activities
             SET title = ?, description = ?, activity_date = ?, activity_type = ?
             WHERE id = ?`,
            [
                title || current.title,
                description !== undefined ? description : current.description,
                activity_date || current.activity_date,
                activity_type !== undefined ? activity_type : current.activity_type,
                activityId
            ]
        );

        const [updated] = await query(
            `SELECT id, title, description, activity_date, activity_type, status, created_at
             FROM activities WHERE id = ?`,
            [activityId]
        );

        return res.json({ success: true, activity: updated[0] });

    } catch (err) {

        console.error("updateActivity error:", err);
        return res.status(500).json({ success: false, message: "Failed to update activity." });

    }

};


// =====================================================
// MARK COMPLETE / PENDING
//
// PUT /api/activities/:id/status
// Body: { user_id, status: 'pending' | 'completed' }
// =====================================================

exports.updateActivityStatus = async (req, res) => {

    try {

        const activityId = req.params.id;
        const { user_id, status } = req.body || {};

        if (!user_id || !["pending", "completed"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "user_id and a valid status ('pending' or 'completed') are required."
            });
        }

        const [result] = await query(
            `UPDATE activities SET status = ? WHERE id = ? AND user_id = ?`,
            [status, activityId, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Activity not found." });
        }

        return res.json({ success: true, status });

    } catch (err) {

        console.error("updateActivityStatus error:", err);
        return res.status(500).json({ success: false, message: "Failed to update activity status." });

    }

};


// =====================================================
// DELETE ACTIVITY
//
// DELETE /api/activities/:id
// Body/query: user_id
// =====================================================

exports.deleteActivity = async (req, res) => {

    try {

        const activityId = req.params.id;
        const userId = (req.body && req.body.user_id) || req.query.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const [result] = await query(
            `DELETE FROM activities WHERE id = ? AND user_id = ?`,
            [activityId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Activity not found." });
        }

        return res.json({ success: true, message: "Activity deleted." });

    } catch (err) {

        console.error("deleteActivity error:", err);
        return res.status(500).json({ success: false, message: "Failed to delete activity." });

    }

};
