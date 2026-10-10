const express = require("express");
const {
    searchEquipmentByImage,
    searchCropsByImage,
    uploadMiddleware
} = require("../controllers/imageSearchController");

const router = express.Router();

router.post("/equipment", uploadMiddleware, searchEquipmentByImage);
router.post("/crops", uploadMiddleware, searchCropsByImage);

module.exports = router;
