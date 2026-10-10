const express = require("express");

const router = express.Router();

const resourceController =
    require("../controllers/resourceController");


// =====================================================
// SEARCH RESOURCES (live internet search)
//
// GET /api/resources/search?specialization=Rice
// GET /api/resources/search?topRated=true
// =====================================================

router.get(
    "/search",
    resourceController.searchResources
);


module.exports = router;
