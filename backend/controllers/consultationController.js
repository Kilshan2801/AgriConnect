const db = require("../db");

// =====================================================
// GET RECOMMENDED EXPERTS
// Only approved experts are shown
// =====================================================

exports.getRecommendedExperts = (req, res) => {

    const sql = `
        SELECT
            ep.id,
            ep.user_id,
            ep.phone,
            ep.specialization,
            ep.qualification,
            ep.experience_years,
            ep.bio,
            u.first_name,
            u.last_name,
            u.email
        FROM expert_profiles ep
        INNER JOIN users u
            ON ep.user_id = u.id
        WHERE ep.approval_status = 'approved'
        AND u.is_active = 1
        AND u.removed_at IS NULL
        ORDER BY ep.created_at DESC
        LIMIT 3
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error("Error fetching recommended experts:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to load recommended experts"
            });
        }

        res.json({
            success: true,
            experts: results
        });

    });
};


// =====================================================
// SEARCH EXPERTS
// Search by expert name OR specialization
// =====================================================

exports.searchExperts = (req, res) => {

    const search = req.query.q || "";

    if (!search.trim()) {

        return res.json({
            success: true,
            experts: []
        });

    }

    const searchTerm = `%${search.trim()}%`;

    const sql = `
        SELECT
            ep.id,
            ep.user_id,
            ep.phone,
            ep.specialization,
            ep.qualification,
            ep.experience_years,
            ep.bio,
            u.first_name,
            u.last_name,
            u.email
        FROM expert_profiles ep
        INNER JOIN users u
            ON ep.user_id = u.id
        WHERE ep.approval_status = 'approved'
        AND u.is_active = 1
        AND u.removed_at IS NULL
        AND (
            CONCAT(u.first_name, ' ', u.last_name) LIKE ?
            OR ep.specialization LIKE ?
        )
        ORDER BY
            CASE
                WHEN CONCAT(u.first_name, ' ', u.last_name) LIKE ?
                THEN 1
                ELSE 2
            END,
            u.first_name ASC
    `;

    db.query(
        sql,
        [
            searchTerm,
            searchTerm,
            searchTerm
        ],
        (err, results) => {

            if (err) {

                console.error("Error searching experts:", err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to search experts"
                });

            }

            res.json({
                success: true,
                experts: results
            });

        }
    );

};


// =====================================================
// GET EXPERT DETAILS
// =====================================================

exports.getExpertDetails = (req, res) => {

    const expertId = req.params.id;

    const sql = `
        SELECT
            ep.id,
            ep.user_id,
            ep.phone,
            ep.specialization,
            ep.qualification,
            ep.experience_years,
            ep.bio,
            ep.approval_status,
            u.first_name,
            u.last_name,
            u.email
        FROM expert_profiles ep
        INNER JOIN users u
            ON ep.user_id = u.id
        WHERE ep.id = ?
        AND ep.approval_status = 'approved'
        AND u.is_active = 1
        AND u.removed_at IS NULL
        LIMIT 1
    `;

    db.query(
        sql,
        [expertId],
        (err, results) => {

            if (err) {

                console.error("Error fetching expert details:", err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to load expert details"
                });

            }

            if (results.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Expert not found or not approved"
                });

            }

            res.json({
                success: true,
                expert: results[0]
            });

        }
    );

};


/*
=========================================================
GET MY OWN SPECIALIZATION (by user_id)

Used by the expert's own Resources page to know what
"related to their specialization" means for them.
=========================================================
*/

exports.getMySpecialization = (req, res) => {

    const userId = req.params.userId;

    if (!userId) {

        return res.status(400).json({
            success: false,
            message: "User ID is required."
        });

    }

    const sql = `
        SELECT specialization
        FROM expert_profiles
        WHERE user_id = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [userId],
        (err, results) => {

            if (err) {

                console.error(
                    "Get my specialization error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to load specialization."
                });

            }

            if (results.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Expert profile not found."
                });

            }

            return res.status(200).json({
                success: true,
                specialization: results[0].specialization
            });

        }
    );

};