const db = require("../db");
const bcrypt = require("bcrypt");
const path = require("path");
const multer = require("multer");


// =====================================================
// UPLOAD CONFIG (profile pictures)
// =====================================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "../../uploads"));
    },

    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || ".png";
        cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
    }

});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
        const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error("Only PNG, JPG, or WEBP images are allowed."));
        }
        cb(null, true);
    }
});

exports.uploadMiddleware = upload.single("profile_picture");


// =====================================================
// GET SETTINGS
// =====================================================

exports.getSettings = async (req, res) => {

    const userId = req.params.id;

    try {

        const [[user]] = await db.promise().query(
            `SELECT id, first_name, last_name, email, phone, address,
                    profile_picture, preferred_language
             FROM users WHERE id = ?`,
            [userId]
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        res.json({ success: true, settings: user });

    } catch (error) {

        console.error("getSettings error:", error);
        res.status(500).json({ success: false, message: "Failed to load settings." });

    }

};


// =====================================================
// UPDATE PROFILE PICTURE
// =====================================================

exports.updateProfilePicture = async (req, res) => {

    const userId = req.params.id;

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No image file was uploaded." });
    }

    try {

        await db.promise().query(
            `UPDATE users SET profile_picture = ? WHERE id = ?`,
            [req.file.filename, userId]
        );

        res.json({
            success: true,
            message: "Profile picture updated.",
            profile_picture: req.file.filename
        });

    } catch (error) {

        console.error("updateProfilePicture error:", error);
        res.status(500).json({ success: false, message: "Failed to update profile picture." });

    }

};


// =====================================================
// UPDATE LANGUAGE
// =====================================================

const VALID_LANGUAGES = ["en", "ta", "si"];

exports.updateLanguage = async (req, res) => {

    const userId = req.params.id;
    const { language } = req.body;

    if (!VALID_LANGUAGES.includes(language)) {
        return res.status(400).json({ success: false, message: "Unsupported language." });
    }

    try {

        await db.promise().query(
            `UPDATE users SET preferred_language = ? WHERE id = ?`,
            [language, userId]
        );

        res.json({ success: true, message: "Language updated.", language });

    } catch (error) {

        console.error("updateLanguage error:", error);
        res.status(500).json({ success: false, message: "Failed to update language." });

    }

};


// =====================================================
// UPDATE PASSWORD
// =====================================================

exports.updatePassword = async (req, res) => {

    const userId = req.params.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({ success: false, message: "Both current and new password are required." });
    }

    if (new_password.length < 6) {
        return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    try {

        const [[user]] = await db.promise().query(
            `SELECT password FROM users WHERE id = ?`,
            [userId]
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const matches = await bcrypt.compare(current_password, user.password);

        if (!matches) {
            return res.status(401).json({ success: false, message: "Current password is incorrect." });
        }

        const hashed = await bcrypt.hash(new_password, 10);

        await db.promise().query(
            `UPDATE users SET password = ? WHERE id = ?`,
            [hashed, userId]
        );

        res.json({ success: true, message: "Password updated successfully." });

    } catch (error) {

        console.error("updatePassword error:", error);
        res.status(500).json({ success: false, message: "Failed to update password." });

    }

};


// =====================================================
// UPDATE CONTACT DETAILS (address/phone - not name/NIC)
// =====================================================

exports.updateContactDetails = async (req, res) => {

    const userId = req.params.id;
    const { phone, address } = req.body;

    try {

        await db.promise().query(
            `UPDATE users SET phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?`,
            [phone || null, address || null, userId]
        );

        res.json({ success: true, message: "Contact details updated." });

    } catch (error) {

        console.error("updateContactDetails error:", error);
        res.status(500).json({ success: false, message: "Failed to update contact details." });

    }

};
