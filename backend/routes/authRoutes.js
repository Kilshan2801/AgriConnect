const express = require("express");
const multer = require("multer");
const path = require("path");

const {
    registerUser,
    loginUser,
    getMyDistrict,
    heartbeat,
    getOnlineStatus
} = require("../controllers/authController");

const router = express.Router();

// Store uploaded files in the SAME uploads folder that server.js
// serves at /uploads (../uploads relative to backend/), not a
// separate backend/uploads/ folder that never gets served.
//
// A custom filename function preserves the original extension so
// the browser can render these back as images (a plain multer
// "dest" option strips the extension, which makes the server send
// application/octet-stream instead of image/*).
const uploadStorage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "../../uploads/"));
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

const upload = multer({ storage: uploadStorage });

// Registration route
router.post(
    "/register",
    upload.fields([
        { name: "nic_front", maxCount: 1 },
        { name: "nic_back", maxCount: 1 },
        { name: "certification_document", maxCount: 1 },
        { name: "proof_document", maxCount: 1 }
    ]),
    registerUser
);

router.post("/login", loginUser);

router.get("/my-district/:userId", getMyDistrict);

router.post("/heartbeat", heartbeat);

router.get("/online-status/:userId", getOnlineStatus);

module.exports = router;