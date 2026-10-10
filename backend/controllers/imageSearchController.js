const db = require("../db");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Jimp, distance } = require("jimp");


// =====================================================
// UPLOAD CONFIG (temporary search image - not saved
// permanently, just used to compute a hash then deleted)
// =====================================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error("Only PNG, JPG, or WEBP images are allowed."));
        }
        cb(null, true);
    }
});

exports.uploadMiddleware = upload.single("search_image");


// A distance below this is considered a visual match. Jimp's
// distance() returns 0 (identical) to 1 (completely different).
const SIMILARITY_THRESHOLD = 0.30;


function resolveUploadPath(filename) {

    // Uploads can live in either of two places in this project
    // (see server.js's own fallback handler for the same reason):
    // the current upload folder, or the legacy backend/uploads
    // folder from before an earlier path fix.
    const primary = path.join(__dirname, "../../uploads", filename);
    if (fs.existsSync(primary)) return primary;

    const fallback = path.join(__dirname, "../uploads", filename);
    if (fs.existsSync(fallback)) return fallback;

    return null;

}


async function findVisualMatches({ searchImageBuffer, rows, imageField, idField }) {

    const searchImage = await Jimp.read(searchImageBuffer);

    const results = [];

    for (const row of rows) {

        const imageName = row[imageField];

        if (!imageName) continue;

        const imagePath = resolveUploadPath(imageName);

        if (!imagePath) continue;

        try {

            const listingImage = await Jimp.read(imagePath);
            const d = distance(searchImage, listingImage);

            if (d <= SIMILARITY_THRESHOLD) {

                results.push({
                    ...row,
                    similarity: 1 - d
                });

            }

        } catch (error) {

            // Skip listings whose image file can't be read/decoded
            // rather than failing the whole search.
            console.error(`Unable to compare image for ${idField}=${row[idField]}:`, error.message);

        }

    }

    results.sort((a, b) => b.similarity - a.similarity);

    return results;

}


// =====================================================
// SEARCH EQUIPMENT BY IMAGE
// =====================================================

exports.searchEquipmentByImage = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No search image was uploaded." });
    }

    try {

        const [rows] = await db.promise().query(
            `SELECT
                e.id,
                e.equipment_name,
                e.category,
                e.rental_price,
                e.price_unit,
                e.availability_status,
                e.image,
                epp.business_name,
                epp.district
             FROM equipment e
             INNER JOIN equipment_provider_profiles epp
                ON e.provider_id = epp.id
             WHERE e.availability_status != 'unavailable'
               AND e.image IS NOT NULL`
        );

        const matches = await findVisualMatches({
            searchImageBuffer: req.file.buffer,
            rows,
            imageField: "image",
            idField: "id"
        });

        res.json({ success: true, results: matches });

    } catch (error) {

        console.error("searchEquipmentByImage error:", error);
        res.status(500).json({ success: false, message: "Image search failed. Please try again." });

    }

};


// =====================================================
// SEARCH CROPS BY IMAGE
// =====================================================

exports.searchCropsByImage = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No search image was uploaded." });
    }

    try {

        const [rows] = await db.promise().query(
            `SELECT
                c.id,
                c.crop_name,
                c.specific_name,
                c.price_per_kg,
                c.quantity,
                c.image,
                u.first_name AS farmer_first_name,
                u.last_name AS farmer_last_name
             FROM crops c
             INNER JOIN users u ON c.farmer_id = u.id
             WHERE c.quantity > 0
               AND c.image IS NOT NULL`
        );

        const matches = await findVisualMatches({
            searchImageBuffer: req.file.buffer,
            rows,
            imageField: "image",
            idField: "id"
        });

        res.json({ success: true, results: matches });

    } catch (error) {

        console.error("searchCropsByImage error:", error);
        res.status(500).json({ success: false, message: "Image search failed. Please try again." });

    }

};
