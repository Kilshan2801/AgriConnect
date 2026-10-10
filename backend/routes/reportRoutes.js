const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const reportController =
    require("../controllers/reportController");


const reportUploadDirectory =
    path.join(__dirname, "../../uploads/reports");

if (!fs.existsSync(reportUploadDirectory)) {
    fs.mkdirSync(reportUploadDirectory, { recursive: true });
}

const reportStorage =
    multer.diskStorage({

        destination: function (req, file, cb) {
            cb(null, reportUploadDirectory);
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

const upload = multer({ storage: reportStorage });


// =====================================================
// REPORT ROUTES
// =====================================================


// Get reports submitted by farmer
router.get(
    "/my",
    reportController.getMyReports
);


// Create new report
router.post(
    "/",
    upload.array("images", 5),
    reportController.createReport
);


// Get one report
router.get(
    "/:id",
    reportController.getReportById
);


module.exports = router;