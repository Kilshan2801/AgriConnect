const db = require("../db");
const { createNotification } = require("./notificationController");


// =====================================================
// GET ALL REGISTRATIONS
// =====================================================
//
// GET /api/admin/registrations
//
// Admin can view:
//   1. Agricultural Experts
//   2. Equipment Providers
//
// Database values:
//   expert              -> Agricultural Expert
//   equipment_provider  -> Equipment Provider
//
// =====================================================

exports.getRegistrations = (req, res) => {

    const sql = `

        SELECT

            r.id,
            r.user_id,
            r.registration_type,
            r.status,
            r.reviewed_by,
            r.review_note,
            r.created_at,
            r.reviewed_at,

            u.first_name,
            u.last_name,
            u.phone,
            u.email,
            u.address,
            u.nic_front,
            u.nic_back,

            epp.business_name,
            epp.district AS provider_district,
            epp.approval_status AS provider_approval_status,
            epp.proof_document,

            ep.specialization,
            ep.district AS expert_district,
            ep.approval_status AS expert_approval_status,
            ep.certification_document,

            COALESCE(epp.district, ep.district) AS district,
            COALESCE(epp.approval_status, ep.approval_status) AS approval_status

        FROM registrations r

        INNER JOIN users u
            ON r.user_id = u.id

        LEFT JOIN equipment_provider_profiles epp
            ON r.user_id = epp.user_id

        LEFT JOIN expert_profiles ep
            ON r.user_id = ep.user_id

        WHERE
            r.registration_type IN (
                'expert',
                'equipment_provider'
            )

        ORDER BY
            r.created_at DESC

    `;


    db.query(
        sql,
        (err, registrations) => {

            if (err) {

                console.error(
                    "Get registrations error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to retrieve registrations."

                });

            }


            // =================================================
            // FORMAT REGISTRATION DATA
            // =================================================

            const formattedRegistrations =
                registrations.map(
                    registration => {

                        const databaseRole =
                            String(
                                registration.registration_type
                            ).toLowerCase();


                        let role;


                        // -------------------------------------------------
                        // Equipment Provider
                        // -------------------------------------------------

                        if (
                            databaseRole ===
                            "equipment_provider"
                        ) {

                            role =
                                "provider";

                        }


                        // -------------------------------------------------
                        // Agricultural Expert
                        // -------------------------------------------------

                        else if (
                            databaseRole ===
                            "expert"
                        ) {

                            role =
                                "expert";

                        }


                        // -------------------------------------------------
                        // Full Name
                        // -------------------------------------------------

                        const firstName =
                            registration.first_name ||
                            "";

                        const lastName =
                            registration.last_name ||
                            "";


                        const fullName =
                            `${firstName} ${lastName}`
                                .trim();


                        // -------------------------------------------------
                        // Organization
                        // -------------------------------------------------
                        //
                        // Equipment Provider:
                        //     business_name
                        //
                        // Agricultural Expert:
                        //     business_name may be empty
                        //
                        // -------------------------------------------------

                        const organization =
                            registration.business_name ||
                            "";


                        return {

                            id:
                                registration.id,

                            user_id:
                                registration.user_id,


                            // Applicant name
                            name:
                                fullName ||
                                "Unknown Applicant",


                            first_name:
                                firstName,

                            last_name:
                                lastName,


                            // Contact
                            phone:
                                registration.phone,

                            email:
                                registration.email,

                            address:
                                registration.address,


                            // Role
                            role:
                                role,

                            type:
                                role,


                            // Original database role
                            registration_type:
                                registration.registration_type,


                            // Organization / Business
                            organization:
                                organization,

                            business_name:
                                registration.business_name,


                            // Specialization (Agricultural Expert)
                            specialization:
                                registration.specialization,


                            // Location
                            district:
                                registration.district,


                            // Approval
                            status:
                                registration.status,

                            approval_status:
                                registration.approval_status,


                            // Submitted documents
                            nic_front:
                                registration.nic_front,

                            nic_back:
                                registration.nic_back,

                            certification_document:
                                registration.certification_document,

                            proof_document:
                                registration.proof_document,


                            // Review information
                            review_note:
                                registration.review_note,

                            reviewed_by:
                                registration.reviewed_by,

                            created_at:
                                registration.created_at,

                            reviewed_at:
                                registration.reviewed_at

                        };

                    }
                );


            // =================================================
            // SUMMARY COUNTS
            // =================================================

            const pendingCount =
                formattedRegistrations.filter(
                    registration =>
                        String(
                            registration.status
                        ).toLowerCase() ===
                        "pending"
                ).length;


            const approvedCount =
                formattedRegistrations.filter(
                    registration =>
                        String(
                            registration.status
                        ).toLowerCase() ===
                        "approved"
                ).length;


            const rejectedCount =
                formattedRegistrations.filter(
                    registration =>
                        String(
                            registration.status
                        ).toLowerCase() ===
                        "rejected"
                ).length;


            const providerCount =
                formattedRegistrations.filter(
                    registration =>
                        registration.type ===
                        "provider"
                ).length;


            const expertCount =
                formattedRegistrations.filter(
                    registration =>
                        registration.type ===
                        "expert"
                ).length;


            // =================================================
            // SEND RESPONSE
            // =================================================

            return res.json({

                success:
                    true,


                registrations:
                    formattedRegistrations,


                data:
                    formattedRegistrations,


                counts: {

                    total:
                        formattedRegistrations.length,

                    pending:
                        pendingCount,

                    approved:
                        approvedCount,

                    rejected:
                        rejectedCount,

                    providers:
                        providerCount,

                    experts:
                        expertCount

                }

            });

        }
    );

};



// =====================================================
// UPDATE REGISTRATION STATUS
// =====================================================
//
// PUT /api/admin/registrations/:id/status
//
// Admin can:
//   - Approve Agricultural Expert
//   - Reject Agricultural Expert
//   - Approve Equipment Provider
//   - Reject Equipment Provider
//
// =====================================================

exports.updateRegistrationStatus = (req, res) => {

    const registrationId =
        req.params.id;


    const {
        status,
        rejection_reason,
        review_note
    } = req.body;


    // =================================================
    // VALIDATE REGISTRATION ID
    // =================================================

    if (!registrationId) {

        return res.status(400).json({

            success:
                false,

            message:
                "Registration ID is required."

        });

    }


    // =================================================
    // VALIDATE STATUS
    // =================================================

    if (
        !status ||
        ![
            "approved",
            "rejected"
        ].includes(
            String(status).toLowerCase()
        )
    ) {

        return res.status(400).json({

            success:
                false,

            message:
                "Status must be approved or rejected."

        });

    }


    const newStatus =
        String(status).toLowerCase();


    // =================================================
    // FIND REGISTRATION
    // =================================================

    const findSql = `

        SELECT

            id,
            user_id,
            registration_type,
            status

        FROM registrations

        WHERE
            id = ?

        LIMIT 1

    `;


    db.query(

        findSql,

        [registrationId],

        (findErr, registrations) => {

            if (findErr) {

                console.error(
                    "Find registration error:",
                    findErr
                );

                return res.status(500).json({

                    success:
                        false,

                    message:
                        "Failed to find registration."

                });

            }


            // =================================================
            // REGISTRATION NOT FOUND
            // =================================================

            if (
                !registrations ||
                registrations.length === 0
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Registration not found."

                });

            }


            const registration =
                registrations[0];


            // =================================================
            // CHECK REGISTRATION TYPE
            // =================================================

            const registrationType =
                String(
                    registration.registration_type
                ).toLowerCase();


            if (
                ![
                    "expert",
                    "equipment_provider"
                ].includes(
                    registrationType
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "This registration type cannot be reviewed."

                });

            }


            // =================================================
            // UPDATE REGISTRATION
            // =================================================
            //
            // Existing database columns:
            //
            // status
            // review_note
            // reviewed_at
            //
            // There is no rejection_reason column.
            //
            // =================================================

            const updateRegistrationSql = `

                UPDATE registrations

                SET

                    status = ?,

                    review_note = ?,

                    reviewed_at =
                        CURRENT_TIMESTAMP

                WHERE
                    id = ?

            `;


            let note;


            if (
                newStatus ===
                "rejected"
            ) {

                note =
                    rejection_reason ||
                    review_note ||
                    "Registration rejected by administrator.";

            }

            else {

                note =
                    review_note ||
                    null;

            }


            db.query(

                updateRegistrationSql,

                [

                    newStatus,

                    note,

                    registrationId

                ],

                (updateErr) => {

                    if (updateErr) {

                        console.error(
                            "Update registration error:",
                            updateErr
                        );

                        return res.status(500).json({

                            success:
                                false,

                            message:
                                "Failed to update registration."

                        });

                    }


                    // =================================================
                    // EQUIPMENT PROVIDER
                    // =================================================
                    //
                    // When an Equipment Provider is approved/rejected,
                    // update its profile approval_status too.
                    //
                    // =================================================

                    if (
                        registrationType ===
                        "equipment_provider"
                    ) {


                        const updateProviderSql = `

                            UPDATE
                                equipment_provider_profiles

                            SET
                                approval_status = ?

                            WHERE
                                user_id = ?

                        `;


                        db.query(

                            updateProviderSql,

                            [

                                newStatus,

                                registration.user_id

                            ],

                            (
                                providerErr,
                                providerResult
                            ) => {

                                if (
                                    providerErr
                                ) {

                                    console.error(
                                        "Update provider approval error:",
                                        providerErr
                                    );

                                    return res.status(500).json({

                                        success:
                                            false,

                                        message:
                                            "Registration was updated, but equipment provider approval could not be updated."

                                    });

                                }


                                // =================================================
                                // PROVIDER PROFILE NOT FOUND
                                // =================================================

                                if (
                                    !providerResult ||
                                    providerResult.affectedRows === 0
                                ) {

                                    console.warn(

                                        "No equipment provider profile found for user:",

                                        registration.user_id

                                    );


                                    return res.status(404).json({

                                        success:
                                            false,

                                        message:
                                            "Registration was updated, but the equipment provider profile was not found."

                                    });

                                }


                                // =================================================
                                // PROVIDER SUCCESS
                                // =================================================

                                createNotification({
                                    userId: registration.user_id,
                                    type: "registration",
                                    title: newStatus === "approved" ? "Registration approved" : "Registration rejected",
                                    message: newStatus === "approved"
                                        ? "Your Equipment Provider registration has been approved. You can now log in as a provider."
                                        : `Your Equipment Provider registration was rejected.${note ? ` Reason: ${note}` : ""}`,
                                    relatedType: "registration",
                                    relatedId: Number(registrationId)
                                });

                                return res.json({

                                    success:
                                        true,

                                    message:

                                        newStatus ===
                                        "approved"

                                            ?

                                        "Equipment provider approved successfully."

                                            :

                                        "Equipment provider rejected successfully.",


                                    registration_id:
                                        registrationId,

                                    user_id:
                                        registration.user_id,

                                    registration_type:
                                        registration.registration_type,

                                    status:
                                        newStatus

                                });

                            }

                        );

                    }


                    // =================================================
                    // AGRICULTURAL EXPERT
                    // =================================================
                    //
                    // login() checks expert_profiles.approval_status,
                    // NOT registrations.status, so that column must be
                    // kept in sync here (mirrors the provider branch
                    // above). Previously this was skipped, which meant
                    // an "approved" expert could never log in.
                    //
                    // =================================================

                    else if (
                        registrationType ===
                        "expert"
                    ) {

                        const updateExpertSql = `

                            UPDATE
                                expert_profiles

                            SET
                                approval_status = ?

                            WHERE
                                user_id = ?

                        `;


                        db.query(

                            updateExpertSql,

                            [

                                newStatus,

                                registration.user_id

                            ],

                            (
                                expertErr,
                                expertResult
                            ) => {

                                if (
                                    expertErr
                                ) {

                                    console.error(
                                        "Update expert approval error:",
                                        expertErr
                                    );

                                    return res.status(500).json({

                                        success:
                                            false,

                                        message:
                                            "Registration was updated, but expert approval could not be updated."

                                    });

                                }


                                if (
                                    !expertResult ||
                                    expertResult.affectedRows === 0
                                ) {

                                    console.warn(
                                        "No expert profile found for user:",
                                        registration.user_id
                                    );

                                    return res.status(404).json({

                                        success:
                                            false,

                                        message:
                                            "Registration was updated, but the expert profile was not found."

                                    });

                                }


                                createNotification({
                                    userId: registration.user_id,
                                    type: "registration",
                                    title: newStatus === "approved" ? "Registration approved" : "Registration rejected",
                                    message: newStatus === "approved"
                                        ? "Your Agricultural Expert registration has been approved. You can now log in as an expert."
                                        : `Your Agricultural Expert registration was rejected.${note ? ` Reason: ${note}` : ""}`,
                                    relatedType: "registration",
                                    relatedId: Number(registrationId)
                                });

                                return res.json({

                                    success:
                                        true,

                                    message:

                                        newStatus ===
                                        "approved"

                                            ?

                                        "Agricultural expert approved successfully."

                                            :

                                        "Agricultural expert rejected successfully.",


                                    registration_id:
                                        registrationId,

                                    user_id:
                                        registration.user_id,

                                    registration_type:
                                        registration.registration_type,

                                    status:
                                        newStatus

                                });

                            }

                        );

                    }

                }

            );

        }

    );

};

// =====================================================
// MANAGE USERS
// =====================================================
//
// GET  /api/admin/users?role=farmer|buyer|expert|equipment_provider
// PUT  /api/admin/users/:id/status   { is_active: true|false }
// DELETE /api/admin/users/:id        { reason }
//
// NOTE: admin itself is not a row in `users` (see
// notificationController.js comment for why), so these
// endpoints only ever operate on real users.
// =====================================================

const validManageRoles = [
    "farmer",
    "buyer",
    "expert",
    "equipment_provider"
];


exports.getUsersByRole = (req, res) => {

    const role = req.query.role;

    if (!role || !validManageRoles.includes(role)) {

        return res.status(400).json({
            success: false,
            message: "A valid role query param is required (farmer, buyer, expert, equipment_provider)."
        });

    }

    // Experts and Equipment Providers go through an approval
    // workflow (see Inspect Registrations) - "Manage Users"
    // only lists ones already approved; pending/rejected ones
    // belong to that separate flow, not user management.
    const needsApproval = role === "expert" || role === "equipment_provider";

    const profileJoins = {
        farmer: { table: "farmer_profiles", hasDistrict: true, hasApproval: false },
        buyer: { table: "buyer_profiles", hasDistrict: true, hasApproval: false },
        expert: { table: "expert_profiles", hasDistrict: true, hasApproval: true },
        equipment_provider: { table: "equipment_provider_profiles", hasDistrict: true, hasApproval: true }
    };

    const profile = profileJoins[role];

    const districtColumn = profile.hasDistrict ? "p.district" : "NULL AS district";

    const specializationColumn = role === "expert" ? "p.specialization" : "NULL AS specialization";
    const organizationColumn = role === "equipment_provider" ? "p.business_name AS organization" : "NULL AS organization";
    const proofDocumentColumn =
        role === "expert" ? "p.certification_document AS proof_document" :
        role === "equipment_provider" ? "p.proof_document AS proof_document" :
        "NULL AS proof_document";

    const sql = `
        SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.phone,
            u.email,
            u.is_active,
            u.removed_at,
            u.removed_reason,
            u.created_at,
            u.nic_front,
            u.nic_back,
            u.score,
            u.deactivated_at,
            ${districtColumn},
            ${specializationColumn},
            ${organizationColumn},
            ${proofDocumentColumn}
        FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN ${profile.table} p ON p.user_id = u.id
        WHERE ur.role = ?
        ${needsApproval ? "AND p.approval_status = 'approved'" : ""}
        ORDER BY u.created_at DESC
    `;

    db.query(sql, [role], (err, results) => {

        if (err) {
            console.error("getUsersByRole error:", err);
            return res.status(500).json({ success: false, message: "Failed to load users." });
        }

        return res.json({ success: true, users: results });

    });

};


exports.updateUserStatus = (req, res) => {

    const userId = req.params.id;
    const { is_active } = req.body || {};

    if (typeof is_active !== "boolean") {
        return res.status(400).json({ success: false, message: "is_active (true/false) is required." });
    }

    db.query(
        `UPDATE users
         SET is_active = ?,
             deactivated_at = ${is_active ? "NULL" : "CURRENT_TIMESTAMP"}
         WHERE id = ?`,
        [is_active ? 1 : 0, userId],
        (err, result) => {

            if (err) {
                console.error("updateUserStatus error:", err);
                return res.status(500).json({ success: false, message: "Failed to update user status." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "User not found." });
            }

            createNotification({
                userId: Number(userId),
                type: "account",
                title: is_active ? "Account resumed" : "Account paused",
                message: is_active
                    ? "Your account has been resumed by an administrator."
                    : "Your account has been paused by an administrator.",
                relatedType: "user",
                relatedId: Number(userId)
            });

            return res.json({
                success: true,
                message: is_active ? "User account resumed." : "User account paused.",
                is_active: !!is_active
            });

        }
    );

};


// PUT /api/admin/users/:id/score   { delta: -10, reason: "..." }
// Adjusts a user's standing score. Positive deltas restore points
// (e.g. after review), negative deltas deduct them (e.g. after a
// resolved conflict against this user). Score is clamped to 0-100.
exports.adjustUserScore = (req, res) => {

    const userId = req.params.id;
    const { delta, reason } = req.body || {};

    const numericDelta = Number(delta);

    if (!Number.isFinite(numericDelta) || numericDelta === 0) {
        return res.status(400).json({ success: false, message: "A non-zero numeric delta is required." });
    }

    db.query(
        `SELECT score FROM users WHERE id = ?`,
        [userId],
        (err, rows) => {

            if (err) {
                console.error("adjustUserScore lookup error:", err);
                return res.status(500).json({ success: false, message: "Failed to update score." });
            }

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: "User not found." });
            }

            const currentScore = rows[0].score == null ? 100 : rows[0].score;
            const newScore = Math.max(0, Math.min(100, currentScore + numericDelta));

            db.query(
                `UPDATE users SET score = ? WHERE id = ?`,
                [newScore, userId],
                (updateErr) => {

                    if (updateErr) {
                        console.error("adjustUserScore update error:", updateErr);
                        return res.status(500).json({ success: false, message: "Failed to update score." });
                    }

                    if (numericDelta < 0) {

                        createNotification({
                            userId: Number(userId),
                            type: "account",
                            title: "Account standing updated",
                            message: reason
                                ? `Your account score was reduced: ${reason}`
                                : "Your account score was reduced following a review.",
                            relatedType: "user",
                            relatedId: Number(userId)
                        });

                    }

                    return res.json({
                        success: true,
                        message: "User score updated.",
                        score: newScore
                    });

                }
            );

        }
    );

};


exports.removeUser = (req, res) => {

    const userId = req.params.id;
    const reason = (req.body && req.body.reason) || null;

    db.query(
        `UPDATE users SET is_active = 0, removed_at = CURRENT_TIMESTAMP, removed_reason = ? WHERE id = ?`,
        [reason, userId],
        (err, result) => {

            if (err) {
                console.error("removeUser error:", err);
                return res.status(500).json({ success: false, message: "Failed to remove user." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "User not found." });
            }

            return res.json({ success: true, message: "User removed." });

        }
    );

};


// =====================================================
// MANAGE REPORTS (issue reports + "Reported Conflicts")
// =====================================================
//
// GET /api/admin/reports?status=&report_type=
// PUT /api/admin/reports/:id/status   { status, admin_note }
// =====================================================

const validReportStatuses = [
    "pending",
    "in_review",
    "resolved",
    "rejected"
];


exports.getAllReports = (req, res) => {

    const { status, report_type } = req.query;

    let sql = `
        SELECT
            r.id,
            r.reporter_id,
            r.report_type,
            r.priority,
            r.related_to,
            r.related_id,
            r.subject,
            r.description,
            r.contact_method,
            r.attachment,
            r.status,
            r.admin_note,
            r.created_at,
            r.resolved_at,
            u.first_name,
            u.last_name,
            u.email,
            u.phone,
            u.is_active AS reporter_is_active,
            COALESCE(
                (SELECT role FROM user_roles WHERE user_id = r.reporter_id AND role != 'buyer' LIMIT 1),
                'buyer'
            ) AS reporter_role
        FROM reports r
        LEFT JOIN users u ON u.id = r.reporter_id
        WHERE 1 = 1
    `;

    const params = [];

    if (status) {
        sql += ` AND r.status = ?`;
        params.push(status);
    }

    if (report_type) {
        sql += ` AND r.report_type = ?`;
        params.push(report_type);
    }

    sql += ` ORDER BY r.created_at DESC`;

    db.query(sql, params, (err, results) => {

        if (err) {
            console.error("getAllReports error:", err);
            return res.status(500).json({ success: false, message: "Failed to load reports." });
        }

        return res.json({ success: true, reports: results });

    });

};


exports.updateReportStatus = (req, res) => {

    const reportId = req.params.id;
    const { status, admin_note } = req.body || {};

    if (!status || !validReportStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Status must be one of: ${validReportStatuses.join(", ")}.`
        });
    }

    const isFinal = status === "resolved" || status === "rejected";

    db.query(
        `SELECT reporter_id FROM reports WHERE id = ? LIMIT 1`,
        [reportId],
        (lookupErr, lookupResults) => {

            if (lookupErr) {
                console.error("updateReportStatus lookup error:", lookupErr);
                return res.status(500).json({ success: false, message: "Failed to load report." });
            }

            if (lookupResults.length === 0) {
                return res.status(404).json({ success: false, message: "Report not found." });
            }

            const reporterId = lookupResults[0].reporter_id;

            db.query(
                `UPDATE reports
                 SET status = ?, admin_note = ?, resolved_at = ${isFinal ? "CURRENT_TIMESTAMP" : "NULL"}
                 WHERE id = ?`,
                [status, admin_note || null, reportId],
                (updateErr, result) => {

                    if (updateErr) {
                        console.error("updateReportStatus error:", updateErr);
                        return res.status(500).json({ success: false, message: "Failed to update report." });
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).json({ success: false, message: "Report not found." });
                    }

                    createNotification({
                        userId: reporterId,
                        type: "report",
                        title: `Your report was marked ${status}`,
                        message: admin_note
                            ? `Admin note: ${admin_note}`
                            : `Your report has been updated to "${status}".`,
                        relatedType: "report",
                        relatedId: Number(reportId)
                    });

                    return res.json({ success: true, message: "Report updated.", status });

                }
            );

        }
    );

};


// =====================================================
// GET DASHBOARD STATS (Admin Dashboard - all live data)
// GET /api/admin/dashboard-stats
// =====================================================

exports.getDashboardStats = async (req, res) => {

    try {

        // ---- 0. Growth chart period (This Month / Last Month / Last 3 Months / Custom) ----
        const period = req.query.period || "thisMonth";

        let growthChartWhere;
        let growthChartParams = [];

        if (period === "lastMonth") {

            growthChartWhere =
                `u.created_at >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
                 AND u.created_at < DATE_FORMAT(NOW(), '%Y-%m-01')`;

        } else if (period === "last3Months") {

            growthChartWhere =
                `u.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)`;

        } else if (period === "custom") {

            const isValidDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

            const startDate = req.query.startDate;
            const endDate = req.query.endDate;

            if (isValidDate(startDate) && isValidDate(endDate)) {

                growthChartWhere =
                    `u.created_at >= ? AND u.created_at < DATE_ADD(?, INTERVAL 1 DAY)`;

                growthChartParams = [startDate, endDate];

            } else {

                // Missing/invalid custom dates - fall back to this month
                // rather than erroring, since the chart still needs to
                // render something sensible.
                growthChartWhere =
                    `u.created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`;

            }

        } else {

            // thisMonth (default)
            growthChartWhere =
                `u.created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`;

        }

        // ---- 1. Total active users (excluding admin accounts) ----
        const [[totalUsersRow]] = await db.promise().query(
            `SELECT COUNT(*) AS count FROM users u
             WHERE u.is_active = 1 AND u.removed_at IS NULL
               AND NOT EXISTS (
                   SELECT 1 FROM user_roles ur
                   WHERE ur.user_id = u.id AND ur.role = 'admin'
               )`
        );

        // ---- 2. Users per role (active only) ----
        const [roleCounts] = await db.promise().query(
            `SELECT ur.role, COUNT(*) AS count
             FROM user_roles ur
             INNER JOIN users u ON u.id = ur.user_id
             WHERE u.is_active = 1 AND u.removed_at IS NULL
             GROUP BY ur.role`
        );

        const roleCountMap = {};
        roleCounts.forEach(r => { roleCountMap[r.role] = r.count; });

        // "buyer" is auto-added as a secondary role to every account
        // (farmer, expert, provider), so the plain role count above
        // would count almost everyone. For the dashboard, "Buyers"
        // should mean people who registered specifically as a buyer
        // and have no other role.
        const [[pureBuyersRow]] = await db.promise().query(
            `SELECT COUNT(*) AS count FROM users u
             WHERE u.is_active = 1 AND u.removed_at IS NULL
               AND EXISTS (
                   SELECT 1 FROM user_roles ur
                   WHERE ur.user_id = u.id AND ur.role = 'buyer'
               )
               AND (
                   SELECT COUNT(*) FROM user_roles ur2
                   WHERE ur2.user_id = u.id
               ) = 1`
        );

        roleCountMap.buyer = pureBuyersRow.count;

        // ---- 3. New users this week (total + per role, excluding admin) ----
        const [[newUsersThisWeekRow]] = await db.promise().query(
            `SELECT COUNT(*) AS count FROM users u
             WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
               AND u.is_active = 1 AND u.removed_at IS NULL
               AND NOT EXISTS (
                   SELECT 1 FROM user_roles ur
                   WHERE ur.user_id = u.id AND ur.role = 'admin'
               )`
        );

        const [newThisWeekByRole] = await db.promise().query(
            `SELECT ur.role, COUNT(*) AS count
             FROM user_roles ur
             INNER JOIN users u ON u.id = ur.user_id
             WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
               AND u.is_active = 1 AND u.removed_at IS NULL
             GROUP BY ur.role`
        );

        const newThisWeekMap = {};
        newThisWeekByRole.forEach(r => { newThisWeekMap[r.role] = r.count; });

        const [[pureBuyersThisWeekRow]] = await db.promise().query(
            `SELECT COUNT(*) AS count FROM users u
             WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
               AND u.is_active = 1 AND u.removed_at IS NULL
               AND EXISTS (
                   SELECT 1 FROM user_roles ur
                   WHERE ur.user_id = u.id AND ur.role = 'buyer'
               )
               AND (
                   SELECT COUNT(*) FROM user_roles ur2
                   WHERE ur2.user_id = u.id
               ) = 1`
        );

        newThisWeekMap.buyer = pureBuyersThisWeekRow.count;

        // ---- 4. Active conflicts (pending reports) ----
        const [[activeConflictsRow]] = await db.promise().query(
            `SELECT COUNT(*) AS count FROM reports WHERE status = 'pending'`
        );

        const [[resolvedThisWeekRow]] = await db.promise().query(
            `SELECT COUNT(*) AS count FROM reports
             WHERE status IN ('resolved','dismissed')
               AND resolved_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
        );

        // ---- 5. Growth chart - weekly new-user counts per role, for the selected period ----
        const [weeklyRows] = await db.promise().query(
            `SELECT
                YEARWEEK(u.created_at, 1) AS year_week,
                MIN(DATE(u.created_at)) AS week_start,
                ur.role,
                COUNT(*) AS count
             FROM users u
             INNER JOIN user_roles ur ON ur.user_id = u.id
             WHERE ${growthChartWhere}
               AND u.is_active = 1 AND u.removed_at IS NULL
               AND ur.role != 'admin'
             GROUP BY year_week, ur.role
             ORDER BY year_week ASC`,
            growthChartParams
        );

        // ---- 6. Users by role (for donut) ----
        const totalForPercent = totalUsersRow.count || 1;

        const usersByRole = ["farmer", "buyer", "expert", "equipment_provider"].map(role => ({
            role,
            count: roleCountMap[role] || 0,
            percent: Number((((roleCountMap[role] || 0) / totalForPercent) * 100).toFixed(1))
        }));

        // ---- 7. Recent conflicts (latest 5 reports) ----
        const [recentConflicts] = await db.promise().query(
            `SELECT
                r.id, r.report_type, r.priority, r.related_to, r.related_id,
                r.subject, r.status, r.created_at,
                u.first_name, u.last_name,
                COALESCE(
                    (SELECT role FROM user_roles WHERE user_id = r.reporter_id AND role != 'buyer' LIMIT 1),
                    'buyer'
                ) AS reporter_role
             FROM reports r
             LEFT JOIN users u ON u.id = r.reporter_id
             ORDER BY r.created_at DESC
             LIMIT 5`
        );

        // ---- 8. Recent activity feed (combine several sources, sort by time) ----
        const [recentRegistrations] = await db.promise().query(
            `SELECT r.id, r.registration_type, r.status, r.created_at, r.reviewed_at,
                    u.first_name, u.last_name, epp.business_name
             FROM registrations r
             INNER JOIN users u ON r.user_id = u.id
             LEFT JOIN equipment_provider_profiles epp ON r.user_id = epp.user_id
             ORDER BY r.created_at DESC
             LIMIT 5`
        );

        const [recentApprovals] = await db.promise().query(
            `SELECT r.id, r.registration_type, r.status, r.reviewed_at,
                    u.first_name, u.last_name, epp.business_name
             FROM registrations r
             INNER JOIN users u ON r.user_id = u.id
             LEFT JOIN equipment_provider_profiles epp ON r.user_id = epp.user_id
             WHERE r.status = 'approved' AND r.reviewed_at IS NOT NULL
             ORDER BY r.reviewed_at DESC
             LIMIT 5`
        );

        const [recentReports] = await db.promise().query(
            `SELECT r.id, r.report_type, r.subject, r.status, r.created_at, r.resolved_at
             FROM reports r
             ORDER BY r.created_at DESC
             LIMIT 5`
        );

        const activityEvents = [];

        recentRegistrations.forEach(row => {
            activityEvents.push({
                icon: row.registration_type === "expert" ? "🎓" : (row.registration_type === "equipment_provider" ? "🚜" : "👤"),
                iconClass: row.registration_type === "expert" ? "orange" : "purple",
                title: `${row.registration_type === "expert" ? "Agricultural expert" : row.registration_type === "equipment_provider" ? "Equipment provider" : "User"} registered`,
                description: row.business_name || `${row.first_name || ""} ${row.last_name || ""}`.trim(),
                time: row.created_at
            });
        });

        recentApprovals.forEach(row => {
            activityEvents.push({
                icon: row.registration_type === "expert" ? "🎓" : (row.registration_type === "equipment_provider" ? "🚜" : "👤"),
                iconClass: row.registration_type === "expert" ? "orange" : "purple",
                title: `${row.registration_type === "expert" ? "Agricultural expert" : row.registration_type === "equipment_provider" ? "Equipment provider" : "User"} approved`,
                description: row.business_name || `${row.first_name || ""} ${row.last_name || ""}`.trim(),
                time: row.reviewed_at
            });
        });

        recentReports.forEach(row => {
            activityEvents.push({
                icon: "⚠️",
                iconClass: "red",
                title: "Conflict reported",
                description: row.subject,
                time: row.created_at
            });

            if (row.status === "resolved" && row.resolved_at) {
                activityEvents.push({
                    icon: "✓",
                    iconClass: "green",
                    title: "Conflict resolved",
                    description: row.subject,
                    time: row.resolved_at
                });
            }
        });

        activityEvents.sort((a, b) => new Date(b.time) - new Date(a.time));

        const recentActivity = activityEvents.slice(0, 8);


        return res.json({

            success: true,

            stats: {
                totalUsers: totalUsersRow.count,
                newUsersThisWeek: newUsersThisWeekRow.count,
                farmers: roleCountMap.farmer || 0,
                newFarmersThisWeek: newThisWeekMap.farmer || 0,
                buyers: roleCountMap.buyer || 0,
                newBuyersThisWeek: newThisWeekMap.buyer || 0,
                experts: roleCountMap.expert || 0,
                newExpertsThisWeek: newThisWeekMap.expert || 0,
                providers: roleCountMap.equipment_provider || 0,
                newProvidersThisWeek: newThisWeekMap.equipment_provider || 0,
                activeConflicts: activeConflictsRow.count,
                resolvedConflictsThisWeek: resolvedThisWeekRow.count
            },

            usersByRole,

            growthChart: weeklyRows,

            recentConflicts,

            recentActivity

        });

    } catch (error) {

        console.error("getDashboardStats error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load dashboard stats."
        });

    }

};


// =====================================================
// SEND WARNING / MESSAGE TO A USER
//
// Lets an admin send a direct message/warning to a specific
// user - typically used after reviewing a complaint made
// against them, to formally warn them about their conduct.
//
// POST /api/admin/users/:id/warn
// Body: { subject, message, sent_by }
// =====================================================

exports.sendUserWarning = async (req, res) => {

    const userId = req.params.id;
    const { subject, message, sent_by } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required." });
    }

    if (!subject || !message) {
        return res.status(400).json({
            success: false,
            message: "A subject and message are required."
        });
    }

    try {

        const [[targetUser]] = await db.promise().query(
            `SELECT id, first_name, last_name, is_active FROM users WHERE id = ?`,
            [userId]
        );

        if (!targetUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        await createNotification({
            userId: targetUser.id,
            type: "admin_warning",
            title: subject,
            message: message,
            relatedType: "admin_message",
            relatedId: sent_by || null
        });

        return res.json({

            success: true,

            message: `Message sent to ${targetUser.first_name} ${targetUser.last_name}.`

        });

    } catch (error) {

        console.error("sendUserWarning error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send message."
        });

    }

};
