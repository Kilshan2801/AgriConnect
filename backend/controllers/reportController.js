const db = require("../db");
const { createNotification } = require("./notificationController");

// =====================================================
// GET MY REPORTS
// =====================================================

exports.getMyReports = (req, res) => {

    // Temporary fallback while authentication is being connected
    const reporterId = req.query.reporter_id || 1;

    const sql = `
        SELECT
            id,
            report_type,
            priority,
            related_to,
            related_id,
            subject,
            description,
            contact_method,
            attachment,
            status,
            admin_note,
            created_at,
            resolved_at
        FROM reports
        WHERE reporter_id = ?
        ORDER BY created_at DESC
    `;

    db.query(
        sql,
        [reporterId],
        (err, results) => {

            if (err) {

                console.error(
                    "Get reports error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to load reports."
                });

            }

            res.json({
                success: true,
                reports: results
            });

        }
    );

};


// =====================================================
// CREATE REPORT
// =====================================================

exports.createReport = (req, res) => {

    const reporterId =
        req.body.reporter_id;

    const {
        category,
        priority,
        related_to,
        related_id,
        title,
        description,
        contact_method
    } = req.body;


    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!reporterId) {

        return res.status(400).json({
            success: false,
            message: "reporter_id is required."
        });

    }

    if (
        !category ||
        !title ||
        !description
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Report category, subject and description are required."

        });

    }


    let attachmentPath = null;

    if (req.files && req.files.length > 0) {

        const rawPath = String(req.files[0].path || "").replace(/\\/g, "/");
        const uploadsIndex = rawPath.indexOf("uploads/");

        attachmentPath =
            uploadsIndex >= 0
                ? "/" + rawPath.substring(uploadsIndex)
                : "/uploads/reports/" + req.files[0].filename;

    }


    // The database only accepts 'message' or 'email' for this
    // column, but the frontend shows friendlier labels like
    // "In-App Message" - normalize whatever comes in.
    const normalizedContactMethod =
        String(contact_method || "").toLowerCase().includes("email")
            ? "email"
            : "message";


    // -------------------------------------------------
    // INSERT REPORT
    // -------------------------------------------------

    const sql = `

        INSERT INTO reports
        (
            reporter_id,
            report_type,
            priority,
            related_to,
            related_id,
            subject,
            description,
            contact_method,
            attachment,
            status
        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')

    `;


    db.query(

        sql,

        [
            reporterId,
            category,
            priority || "medium",
            related_to || null,
            related_id || null,
            title,
            description,
            normalizedContactMethod,
            attachmentPath
        ],

        (err, result) => {

            if (err) {

                console.error(
                    "Create report error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to submit report."

                });

            }


            res.status(201).json({

                success: true,

                message:
                    "Report submitted successfully.",

                report_id:
                    result.insertId

            });


            // Notify every admin account - fire-and-forget,
            // does not block the response above.
            db.query(
                `SELECT u.id FROM users u
                 INNER JOIN user_roles ur ON ur.user_id = u.id
                 WHERE ur.role = 'admin'`,
                (adminErr, admins) => {

                    if (adminErr || !admins) return;

                    admins.forEach(admin => {

                        createNotification({
                            userId: admin.id,
                            type: "report",
                            title: "New reported issue",
                            message: `${category} report: "${title}"`,
                            relatedType: "report",
                            relatedId: result.insertId
                        });

                    });

                }
            );

        }

    );

};


// =====================================================
// GET SINGLE REPORT
// =====================================================

exports.getReportById = (req, res) => {

    const reportId =
        req.params.id;


    const reporterId =
        req.query.reporter_id || 1;


    const sql = `

        SELECT
            id,
            report_type,
            priority,
            related_to,
            related_id,
            subject,
            description,
            contact_method,
            attachment,
            status,
            admin_note,
            created_at,
            resolved_at

        FROM reports

        WHERE id = ?
        AND reporter_id = ?

        LIMIT 1

    `;


    db.query(

        sql,

        [
            reportId,
            reporterId
        ],

        (err, results) => {

            if (err) {

                console.error(
                    "Get report error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load report."

                });

            }


            if (
                results.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Report not found."

                });

            }


            res.json({

                success: true,

                report:
                    results[0]

            });

        }

    );

};