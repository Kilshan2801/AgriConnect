const express = require("express");
const {
    getSettings,
    updateProfilePicture,
    updateLanguage,
    updatePassword,
    updateContactDetails,
    uploadMiddleware
} = require("../controllers/settingsController");

const router = express.Router();

router.get("/:id", getSettings);
router.post("/:id/profile-picture", uploadMiddleware, updateProfilePicture);
router.put("/:id/language", updateLanguage);
router.put("/:id/password", updatePassword);
router.put("/:id/contact", updateContactDetails);

module.exports = router;
