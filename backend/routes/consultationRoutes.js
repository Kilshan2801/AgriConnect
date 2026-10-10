const express = require("express");

const router = express.Router();

const consultationController = require("../controllers/consultationController");


// =====================================================
// GET RECOMMENDED EXPERTS
// =====================================================

router.get(
    "/recommended",
    consultationController.getRecommendedExperts
);


// =====================================================
// SEARCH EXPERTS
// Search by name or specialization
// Example:
// /api/consultations/search?q=paddy
// =====================================================

router.get(
    "/search",
    consultationController.searchExperts
);


// =====================================================
// GET EXPERT DETAILS
// Example:
// /api/consultations/experts/1
// =====================================================

router.get(
    "/experts/:id",
    consultationController.getExpertDetails
);


// =====================================================
// GET MY OWN SPECIALIZATION
// Example:
// /api/consultations/my-specialization/8
// =====================================================

router.get(
    "/my-specialization/:userId",
    consultationController.getMySpecialization
);


module.exports = router;