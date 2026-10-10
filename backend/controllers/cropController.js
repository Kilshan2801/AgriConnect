const db = require("../db");


// =====================================================
// ADD NEW CROP
// =====================================================

const addCrop = (req, res) => {

    console.log("========== ADD CROP DEBUG ==========");
    console.log("BODY:", req.body);
    console.log("QUANTITY:", req.body?.quantity);
    console.log("====================================");

    const {
        farmer_id,
        crop_name,
        specific_name,
        harvested_date,
        price_per_kg,
        quantity,
        description
    } = req.body;


    // -------------------------------------------------
    // Required fields
    // -------------------------------------------------

    if (
        !farmer_id ||
        !crop_name ||
        !harvested_date ||
        !price_per_kg ||
        quantity === undefined ||
        quantity === null ||
        quantity === ""
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Crop name, harvested date, price, quantity and farmer ID are required."

        });

    }


    // -------------------------------------------------
    // Validate quantity
    // -------------------------------------------------

    if (
        isNaN(quantity) ||
        Number(quantity) <= 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Quantity must be greater than 0."

        });

    }


    // -------------------------------------------------
    // Images are required
    // -------------------------------------------------

    if (
        !req.files ||
        req.files.length === 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "At least one crop image is required."

        });

    }


    // -------------------------------------------------
    // Verify this account actually holds the farmer role
    // -------------------------------------------------

    const roleCheckSql = `
        SELECT id FROM user_roles
        WHERE user_id = ? AND role = 'farmer'
        LIMIT 1
    `;

    db.query(
        roleCheckSql,
        [farmer_id],
        (roleError, roleResults) => {

            if (roleError) {

                console.error(
                    "Farmer role check error:",
                    roleError
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to verify account role."
                });

            }

            if (roleResults.length === 0) {

                return res.status(403).json({
                    success: false,
                    message: "Only farmer accounts can list crops."
                });

            }

            insertCrop();

        }
    );


    function insertCrop() {

    // -------------------------------------------------
    // Determine image path from the uploaded file(s), if any
    // -------------------------------------------------

    let imagePath = null;

    if (req.files && req.files.length > 0) {

        const rawPath = String(req.files[0].path || "").replace(/\\/g, "/");
        const uploadsIndex = rawPath.indexOf("uploads/");

        imagePath =
            uploadsIndex >= 0
                ? "/" + rawPath.substring(uploadsIndex)
                : "/uploads/" + req.files[0].filename;

    }


    // -------------------------------------------------
    // Insert crop
    // -------------------------------------------------

    const cropSql = `

        INSERT INTO crops
        (
            farmer_id,
            crop_name,
            specific_name,
            harvested_date,
            price_per_kg,
            quantity,
            description,
            image
        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?)

    `;


    const cropValues = [

        farmer_id,

        crop_name,

        specific_name || null,

        harvested_date,

        price_per_kg,

        quantity,

        description || null,

        imagePath

    ];


    db.query(
        cropSql,
        cropValues,
        (err, result) => {

            if (err) {

                console.error(
                    "Add crop error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to add crop."

                });

            }


            const cropId =
                result.insertId;


            // =================================================
            // SAVE CROP IMAGES
            // =================================================

            const imageValues =
                req.files.map(
                    (file) => [

                        cropId,

                        `/uploads/crops/${file.filename}`

                    ]
                );


            const imageSql = `

                INSERT INTO crop_images
                (
                    crop_id,
                    image_path
                )

                VALUES ?

            `;


            db.query(
                imageSql,
                [imageValues],
                (imageError) => {

                    if (imageError) {

                        console.error(
                            "Save crop images error:",
                            imageError
                        );


                        // Remove crop if image saving fails

                        db.query(
                            "DELETE FROM crops WHERE id = ?",
                            [cropId]
                        );


                        return res.status(500).json({

                            success: false,

                            message:
                                "Failed to save crop images."

                        });

                    }


                    return res.status(201).json({

                        success: true,

                        message:
                            "Crop added successfully.",

                        cropId:
                            cropId

                    });

                }
            );

        }
    );

    }

};


// =====================================================
// GET ALL CROPS FOR A FARMER
// =====================================================

const getFarmerCrops = (req, res) => {

    const {
        farmer_id
    } = req.params;


    if (!farmer_id) {

        return res.status(400).json({

            success: false,

            message:
                "Farmer ID is required."

        });

    }


    const cropSql = `

        SELECT

            id,

            farmer_id,

            crop_name,

            specific_name,

            harvested_date,

            price_per_kg,

            quantity,

            description,

            image,

            created_at

        FROM crops

        WHERE farmer_id = ?

        ORDER BY created_at DESC

    `;


    db.query(
        cropSql,
        [farmer_id],
        (err, crops) => {

            if (err) {

                console.error(
                    "Get crops error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to retrieve crops."

                });

            }


            if (
                crops.length === 0
            ) {

                return res.status(200).json({

                    success: true,

                    crops: []

                });

            }


            // -------------------------------------------------
            // Get crop IDs
            // -------------------------------------------------

            const cropIds =
                crops.map(
                    crop => crop.id
                );


            // -------------------------------------------------
            // Get images
            // -------------------------------------------------

            const imageSql = `

                SELECT

                    id,

                    crop_id,

                    image_path

                FROM crop_images

                WHERE crop_id IN (?)

                ORDER BY id ASC

            `;


            db.query(
                imageSql,
                [cropIds],
                (imageError, images) => {

                    if (imageError) {

                        console.error(
                            "Get crop images error:",
                            imageError
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Failed to retrieve crop images."

                        });

                    }


                    // -------------------------------------------------
                    // Attach images to each crop
                    // -------------------------------------------------

                    crops.forEach(
                        crop => {

                            crop.images =
                                images

                                    .filter(
                                        image =>
                                            Number(
                                                image.crop_id
                                            ) ===
                                            Number(
                                                crop.id
                                            )
                                    )

                                    .map(
                                        image =>
                                            image.image_path
                                    );

                        }
                    );


                    return res.status(200).json({

                        success: true,

                        crops:
                            crops

                    });

                }
            );

        }
    );

};


// =====================================================
// GET ALL CROPS FOR BUYERS
// =====================================================

const getAllCrops = (req, res) => {

    const cropSql = `

        SELECT

            c.id,

            c.farmer_id,

            c.crop_name,

            c.specific_name,

            c.harvested_date,

            c.price_per_kg,

            c.quantity,

            c.description,

            c.image,

            c.created_at,

            u.first_name AS farmer_first_name,

            u.last_name AS farmer_last_name,

            u.phone AS farmer_phone,

            fp.district AS farmer_district

        FROM crops c

        INNER JOIN users u
            ON c.farmer_id = u.id

        LEFT JOIN farmer_profiles fp
            ON fp.user_id = c.farmer_id

        INNER JOIN user_roles ur
            ON ur.user_id = c.farmer_id
            AND ur.role = 'farmer'

        WHERE u.is_active = 1
        AND u.removed_at IS NULL

        ORDER BY c.created_at DESC

    `;


    db.query(
        cropSql,
        (err, crops) => {

            if (err) {

                console.error(
                    "Get all crops error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to retrieve crops."

                });

            }


            // -------------------------------------------------
            // No crops
            // -------------------------------------------------

            if (
                crops.length === 0
            ) {

                return res.status(200).json({

                    success: true,

                    crops: []

                });

            }


            // -------------------------------------------------
            // Get all crop IDs
            // -------------------------------------------------

            const cropIds =
                crops.map(
                    crop => crop.id
                );


            // -------------------------------------------------
            // Get images for all crops
            // -------------------------------------------------

            const imageSql = `

                SELECT

                    id,

                    crop_id,

                    image_path

                FROM crop_images

                WHERE crop_id IN (?)

                ORDER BY id ASC

            `;


            db.query(
                imageSql,
                [cropIds],
                (imageError, images) => {

                    if (imageError) {

                        console.error(
                            "Get marketplace images error:",
                            imageError
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Failed to retrieve crop images."

                        });

                    }


                    // -------------------------------------------------
                    // Attach images to crops
                    // -------------------------------------------------

                    crops.forEach(
                        crop => {

                            crop.images =
                                images

                                    .filter(
                                        image =>
                                            Number(
                                                image.crop_id
                                            ) ===
                                            Number(
                                                crop.id
                                            )
                                    )

                                    .map(
                                        image =>
                                            image.image_path
                                    );

                        }
                    );


                    return res.status(200).json({

                        success: true,

                        crops:
                            crops

                    });

                }
            );

        }
    );

};


// =====================================================
// GET ONE CROP
// =====================================================

const getCropById = (req, res) => {

    const {
        id
    } = req.params;


    if (!id) {

        return res.status(400).json({

            success: false,

            message:
                "Crop ID is required."

        });

    }


    const cropSql = `

        SELECT

            id,

            farmer_id,

            crop_name,

            specific_name,

            harvested_date,

            price_per_kg,

            quantity,

            description,

            image,

            created_at

        FROM crops

        WHERE id = ?

    `;


    db.query(
        cropSql,
        [id],
        (err, results) => {

            if (err) {

                console.error(
                    "Get crop error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to retrieve crop."

                });

            }


            if (
                results.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Crop not found."

                });

            }


            const crop =
                results[0];


            // -------------------------------------------------
            // Get crop images
            // -------------------------------------------------

            db.query(
                `

                    SELECT

                        id,

                        image_path

                    FROM crop_images

                    WHERE crop_id = ?

                    ORDER BY id ASC

                `,
                [id],
                (imageError, images) => {

                    if (imageError) {

                        console.error(
                            "Get crop images error:",
                            imageError
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Failed to retrieve crop images."

                        });

                    }


                    crop.images =
                        images.map(
                            image =>
                                image.image_path
                        );


                    return res.status(200).json({

                        success: true,

                        crop:
                            crop

                    });

                }
            );

        }
    );

};


// =====================================================
// UPDATE CROP
// =====================================================

const updateCrop = (req, res) => {

    const {
        id
    } = req.params;


    const {
        crop_name,
        specific_name,
        harvested_date,
        price_per_kg,
        quantity,
        description
    } = req.body;


    // -------------------------------------------------
    // Validate required fields
    // -------------------------------------------------

    if (
        !crop_name ||
        !harvested_date ||
        !price_per_kg ||
        quantity === undefined ||
        quantity === null ||
        quantity === ""
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Crop name, harvested date, price and quantity are required."

        });

    }


    // -------------------------------------------------
    // Validate quantity
    // -------------------------------------------------

    if (
        isNaN(quantity) ||
        Number(quantity) <= 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Quantity must be greater than 0."

        });

    }


    const sql = `

        UPDATE crops

        SET

            crop_name = ?,

            specific_name = ?,

            harvested_date = ?,

            price_per_kg = ?,

            quantity = ?,

            description = ?

        WHERE id = ?

    `;


    const values = [

        crop_name,

        specific_name || null,

        harvested_date,

        price_per_kg,

        quantity,

        description || null,

        id

    ];


    db.query(
        sql,
        values,
        (err, result) => {

            if (err) {

                console.error(
                    "Update crop error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to update crop."

                });

            }


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Crop not found."

                });

            }


            return res.status(200).json({

                success: true,

                message:
                    "Crop updated successfully."

            });

        }
    );

};


// =====================================================
// DELETE CROP
// =====================================================

const deleteCrop = (req, res) => {

    const {
        id
    } = req.params;


    const sql = `

        DELETE FROM crops

        WHERE id = ?

    `;


    db.query(
        sql,
        [id],
        (err, result) => {

            if (err) {

                console.error(
                    "Delete crop error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to delete crop."

                });

            }


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Crop not found."

                });

            }


            return res.status(200).json({

                success: true,

                message:
                    "Crop deleted successfully."

            });

        }
    );

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    addCrop,

    getFarmerCrops,

    getAllCrops,

    getCropById,

    updateCrop,

    deleteCrop

};