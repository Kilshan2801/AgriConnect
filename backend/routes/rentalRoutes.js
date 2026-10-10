const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {

    getRecommendedProviders,

    getAllProviders,

    searchMachinery,

    getMachinerySuggestions,

    searchCompanies,

    getCompanySuggestions,

    getProviderDetails,

    getEquipmentDetails,

    updateEquipment,

    setGarageQuantity,

    deleteEquipment,

    reduceEquipmentQuantity,

    createEquipment,

    createRental,

    getProviderRentals,

    updateRentalStatus,

    completeRental,

    getMyRentals,

    getRentalHistory,

    getRentalById

} = require("../controllers/rentalController");


const router = express.Router();


// =====================================================
// MULTER CONFIGURATION
// =====================================================
//
// Used for uploading equipment images.
//
// Files will be stored inside:
// backend/uploads/
//
// =====================================================

const equipmentUploadDirectory =
    path.join(
        __dirname,
        "../../uploads/equipment"
    );

if (
    !fs.existsSync(equipmentUploadDirectory)
) {

    fs.mkdirSync(
        equipmentUploadDirectory,
        { recursive: true }
    );

}

const equipmentStorage =
    multer.diskStorage({

        destination: function (req, file, cb) {
            cb(null, equipmentUploadDirectory);
        },

        filename: function (req, file, cb) {

            const uniqueName =
                Date.now() +
                "-" +
                Math.round(Math.random() * 1e9) +
                path.extname(file.originalname || "");

            cb(null, uniqueName);

        }

    });

const upload = multer({
    storage: equipmentStorage
});


// =====================================================
// RECOMMENDED PROVIDERS
//
// GET /api/rentals/providers/recommended
// =====================================================

router.get(
    "/providers/recommended",
    getRecommendedProviders
);


// =====================================================
// ALL PROVIDERS
//
// GET /api/rentals/providers
// =====================================================

router.get(
    "/providers",
    getAllProviders
);


// =====================================================
// MACHINERY SUGGESTIONS
//
// GET /api/rentals/suggestions/machinery?q=tra
// =====================================================

router.get(
    "/suggestions/machinery",
    getMachinerySuggestions
);


// =====================================================
// COMPANY SUGGESTIONS
//
// GET /api/rentals/suggestions/company?q=kum
// =====================================================

router.get(
    "/suggestions/company",
    getCompanySuggestions
);


// =====================================================
// MACHINERY SEARCH
//
// GET /api/rentals/search/machinery?q=tractor
// =====================================================

router.get(
    "/search/machinery",
    searchMachinery
);


// =====================================================
// COMPANY SEARCH
//
// GET /api/rentals/search/company?q=kumar
// =====================================================

router.get(
    "/search/company",
    searchCompanies
);


// =====================================================
// PROVIDER DETAILS
//
// GET /api/rentals/providers/:providerId
// =====================================================

router.get(
    "/providers/:providerId",
    getProviderDetails
);


// =====================================================
// EQUIPMENT DETAILS
//
// GET /api/rentals/equipment/:equipmentId
// =====================================================

router.get(
    "/equipment/:equipmentId",
    getEquipmentDetails
);


router.put(
    "/equipment/:equipmentId",
    upload.single("equipment_image"),
    updateEquipment
);


router.put(
    "/equipment/:equipmentId/garage",
    setGarageQuantity
);


router.delete(
    "/equipment/:equipmentId",
    deleteEquipment
);


router.patch(
    "/equipment/:equipmentId/reduce",
    reduceEquipmentQuantity
);


// =====================================================
// CREATE EQUIPMENT
//
// POST /api/rentals/equipment
//
// IMPORTANT:
// This route must come before:
//
// /:rentalId
//
// Otherwise "equipment" could be interpreted as a
// rental ID.
//
// =====================================================

router.post(
    "/equipment",
    upload.single("equipment_image"),
    createEquipment
);


// =====================================================
// PROVIDER RENTAL REQUESTS
//
// GET /api/rentals/provider/:providerId
//
// Used by Equipment Provider Dashboard
// =====================================================

router.get(
    "/provider/:providerId",
    getProviderRentals
);


// =====================================================
// MY ACTIVE RENTALS
//
// GET /api/rentals/my/:renterId
// =====================================================

router.get(
    "/my/:renterId",
    getMyRentals
);


// =====================================================
// RENTAL HISTORY
//
// GET /api/rentals/history/:renterId
// =====================================================

router.get(
    "/history/:renterId",
    getRentalHistory
);


// =====================================================
// CREATE RENTAL REQUEST
//
// POST /api/rentals
// =====================================================

router.post(
    "/",
    createRental
);


// =====================================================
// UPDATE RENTAL STATUS
//
// PUT /api/rentals/:rentalId/status
//
// Full chain:
//
// pending   -> approved / rejected / cancelled
// approved  -> delivered / cancelled
// delivered -> received
// received  -> returned
// returned  -> provider_received
//
// =====================================================

router.put(
    "/:rentalId/status",
    updateRentalStatus
);


// =====================================================
// COMPLETE RENTAL (per-side, after provider_received)
//
// PUT /api/rentals/:rentalId/complete
// =====================================================

router.put(
    "/:rentalId/complete",
    completeRental
);


// =====================================================
// GET SINGLE RENTAL
//
// GET /api/rentals/:rentalId
// =====================================================

router.get(
    "/:rentalId",
    getRentalById
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;