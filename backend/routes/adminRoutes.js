const express = require("express");

const {
    getRegistrations,
    updateRegistrationStatus,
    getUsersByRole,
    updateUserStatus,
    adjustUserScore,
    removeUser,
    sendUserWarning,
    getAllReports,
    updateReportStatus,
    getDashboardStats
} = require("../controllers/adminController");

const { getAdminHistory } = require("../controllers/historyController");


const router = express.Router();


// =====================================================
// DASHBOARD STATS (Admin Dashboard - all live data)
//
// GET /api/admin/dashboard-stats
// =====================================================

router.get(
    "/dashboard-stats",
    getDashboardStats
);


// =====================================================
// GET ALL REGISTRATIONS
//
// GET /api/admin/registrations
//
// Used by Admin Dashboard
// =====================================================

router.get(
    "/registrations",
    getRegistrations
);


// =====================================================
// UPDATE REGISTRATION STATUS
//
// PUT /api/admin/registrations/:id/status
//
// Body:
//
// {
//     "status": "approved",
//     "review_note": "Approved successfully."
// }
//
// =====================================================

router.put(
    "/registrations/:id/status",
    updateRegistrationStatus
);


// =====================================================
// MANAGE USERS
//
// GET    /api/admin/users?role=farmer
// PUT    /api/admin/users/:id/status   { is_active }
// DELETE /api/admin/users/:id          { reason }
// =====================================================

router.get(
    "/users",
    getUsersByRole
);

router.put(
    "/users/:id/status",
    updateUserStatus
);

router.put(
    "/users/:id/score",
    adjustUserScore
);

router.delete(
    "/users/:id",
    removeUser
);


// =====================================================
// SEND WARNING / MESSAGE TO A USER
//
// POST /api/admin/users/:id/warn
// Body: { subject, message, sent_by }
// =====================================================

router.post(
    "/users/:id/warn",
    sendUserWarning
);


// =====================================================
// MANAGE REPORTS ("Reported Conflicts" + issue reports)
//
// GET /api/admin/reports?status=&report_type=
// PUT /api/admin/reports/:id/status   { status, admin_note }
// =====================================================

router.get(
    "/reports",
    getAllReports
);

router.put(
    "/reports/:id/status",
    updateReportStatus
);


// =====================================================
// ADMIN HISTORY (audit trail)
//
// GET /api/admin/history
// =====================================================

router.get(
    "/history",
    getAdminHistory
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;