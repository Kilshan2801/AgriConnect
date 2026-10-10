const db = require("../db");
const { createNotification } = require("./notificationController");


// =====================================================
// GET RECOMMENDED RENTAL PROVIDERS
// GET /api/rentals/providers/recommended
// =====================================================

const getRecommendedProviders = (req, res) => {

    const query = `

        SELECT

            epp.id AS provider_id,

            epp.user_id,

            epp.business_name,

            epp.business_description,

            epp.phone,

            epp.district,

            COUNT(e.id) AS equipment_count

        FROM equipment_provider_profiles epp

        INNER JOIN equipment e
            ON e.provider_id = epp.id

        INNER JOIN users u
            ON u.id = epp.user_id

        WHERE epp.approval_status = 'approved'
        AND u.is_active = 1
        AND u.removed_at IS NULL

        GROUP BY
            epp.id,
            epp.user_id,
            epp.business_name,
            epp.business_description,
            epp.phone,
            epp.district

        ORDER BY
            equipment_count DESC,
            epp.business_name ASC

        LIMIT 3

    `;


    db.query(
        query,
        (error, results) => {

            if (error) {

                console.error(
                    "Get recommended providers error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load recommended rental providers."

                });

            }


            return res.status(200).json({

                success: true,

                providers:
                    results

            });

        }
    );

};


// =====================================================
// GET ALL APPROVED RENTAL PROVIDERS
// GET /api/rentals/providers
// =====================================================

const getAllProviders = (req, res) => {

    const query = `

        SELECT

            epp.id AS provider_id,

            epp.user_id,

            epp.business_name,

            epp.business_description,

            epp.phone,

            epp.district,

            COUNT(e.id) AS equipment_count

        FROM equipment_provider_profiles epp

        LEFT JOIN equipment e
            ON e.provider_id = epp.id

        INNER JOIN users u
            ON u.id = epp.user_id

        WHERE epp.approval_status = 'approved'
        AND u.is_active = 1
        AND u.removed_at IS NULL

        GROUP BY
            epp.id,
            epp.user_id,
            epp.business_name,
            epp.business_description,
            epp.phone,
            epp.district

        ORDER BY
            epp.business_name ASC

    `;


    db.query(
        query,
        (error, results) => {

            if (error) {

                console.error(
                    "Get all providers error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load rental providers."

                });

            }


            return res.status(200).json({

                success: true,

                providers:
                    results

            });

        }
    );

};


// =====================================================
// SEARCH MACHINERY
//
// GET /api/rentals/search/machinery?q=tractor
// =====================================================

const searchMachinery = (req, res) => {

    const search =
        (req.query.q || "")
            .trim();


    if (!search) {

        return res.status(400).json({

            success: false,

            message:
                "Machinery search text is required."

        });

    }


    const searchValue =
        `%${search}%`;


    const query = `

        SELECT

            e.id AS equipment_id,

            e.provider_id,

            e.equipment_name,

            e.category,

            e.quantity,

            e.garage_quantity,

            e.description,

            e.rental_price,

            e.price_unit,

            e.availability_status,

            e.image,

            epp.business_name,

            epp.phone,

            epp.district

        FROM equipment e

        INNER JOIN equipment_provider_profiles epp
            ON e.provider_id = epp.id

        INNER JOIN users u
            ON u.id = epp.user_id

        WHERE

            epp.approval_status = 'approved'
            AND u.is_active = 1
            AND u.removed_at IS NULL

            AND

            (

                e.equipment_name LIKE ?

                OR e.category LIKE ?

                OR e.description LIKE ?

            )

        ORDER BY

            CASE

                WHEN LOWER(e.equipment_name)
                    = LOWER(?)
                THEN 1

                WHEN LOWER(e.equipment_name)
                    LIKE LOWER(?)
                THEN 2

                ELSE 3

            END,

            e.equipment_name ASC

    `;


    db.query(
        query,
        [
            searchValue,
            searchValue,
            searchValue,
            search,
            `${search}%`
        ],
        (error, results) => {

            if (error) {

                console.error(
                    "Search machinery error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to search machinery."

                });

            }


            return res.status(200).json({

                success: true,

                search:
                    search,

                results:
                    results

            });

        }
    );

};


// =====================================================
// MACHINERY SUGGESTIONS
//
// GET /api/rentals/suggestions/machinery?q=tra
// =====================================================

const getMachinerySuggestions = (req, res) => {

    const search =
        (req.query.q || "")
            .trim();


    if (!search) {

        return res.status(200).json({

            success: true,

            suggestions: []

        });

    }


    const searchValue =
        `%${search}%`;


    const query = `

        SELECT DISTINCT

            e.equipment_name

        FROM equipment e

        INNER JOIN equipment_provider_profiles epp
            ON e.provider_id = epp.id

        INNER JOIN users u
            ON u.id = epp.user_id

        WHERE

            epp.approval_status = 'approved'
            AND u.is_active = 1
            AND u.removed_at IS NULL

            AND

            e.equipment_name LIKE ?

        ORDER BY

            CASE

                WHEN LOWER(e.equipment_name)
                    LIKE LOWER(?)
                THEN 1

                ELSE 2

            END,

            e.equipment_name ASC

        LIMIT 8

    `;


    db.query(
        query,
        [
            searchValue,
            `${search}%`
        ],
        (error, results) => {

            if (error) {

                console.error(
                    "Machinery suggestions error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load machinery suggestions."

                });

            }


            return res.status(200).json({

                success: true,

                suggestions:
                    results.map(
                        item =>
                            item.equipment_name
                    )

            });

        }
    );

};


// =====================================================
// SEARCH COMPANY / RENTAL NAME
//
// GET /api/rentals/search/company?q=kumar
// =====================================================

const searchCompanies = (req, res) => {

    const search =
        (req.query.q || "")
            .trim();


    if (!search) {

        return res.status(400).json({

            success: false,

            message:
                "Company or rental name is required."

        });

    }


    const searchValue =
        `%${search}%`;


    const query = `

        SELECT

            epp.id AS provider_id,

            epp.user_id,

            epp.business_name,

            epp.business_description,

            epp.phone,

            epp.district,

            COUNT(e.id) AS equipment_count

        FROM equipment_provider_profiles epp

        LEFT JOIN equipment e
            ON e.provider_id = epp.id

        INNER JOIN users u
            ON u.id = epp.user_id

        WHERE

            epp.approval_status = 'approved'
            AND u.is_active = 1
            AND u.removed_at IS NULL

            AND

            epp.business_name LIKE ?

        GROUP BY

            epp.id,
            epp.user_id,
            epp.business_name,
            epp.business_description,
            epp.phone,
            epp.district

        ORDER BY

            CASE

                WHEN LOWER(epp.business_name)
                    LIKE LOWER(?)
                THEN 1

                ELSE 2

            END,

            epp.business_name ASC

        LIMIT 20

    `;


    db.query(
        query,
        [
            searchValue,
            `${search}%`
        ],
        (error, results) => {

            if (error) {

                console.error(
                    "Search companies error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to search rental companies."

                });

            }


            return res.status(200).json({

                success: true,

                search:
                    search,

                results:
                    results

            });

        }
    );

};


// =====================================================
// COMPANY / RENTAL NAME SUGGESTIONS
//
// GET /api/rentals/suggestions/company?q=kum
// =====================================================

const getCompanySuggestions = (req, res) => {

    const search =
        (req.query.q || "")
            .trim();


    if (!search) {

        return res.status(200).json({

            success: true,

            suggestions: []

        });

    }


    const searchValue =
        `%${search}%`;


    const query = `

        SELECT

            epp.business_name

        FROM equipment_provider_profiles epp

        INNER JOIN users u
            ON u.id = epp.user_id

        WHERE

            epp.approval_status = 'approved'
            AND u.is_active = 1
            AND u.removed_at IS NULL

            AND

            epp.business_name LIKE ?

        ORDER BY

            CASE

                WHEN LOWER(epp.business_name)
                    LIKE LOWER(?)
                THEN 1

                ELSE 2

            END,

            epp.business_name ASC

        LIMIT 8

    `;


    db.query(
        query,
        [
            searchValue,
            `${search}%`
        ],
        (error, results) => {

            if (error) {

                console.error(
                    "Company suggestions error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load company suggestions."

                });

            }


            return res.status(200).json({

                success: true,

                suggestions:
                    results.map(
                        item =>
                            item.business_name
                    )

            });

        }
    );

};


// =====================================================
// GET PROVIDER DETAILS + EQUIPMENT
//
// GET /api/rentals/providers/:providerId
// =====================================================

const getProviderDetails = (req, res) => {

    const providerId =
        req.params.providerId;


    if (!providerId) {

        return res.status(400).json({

            success: false,

            message:
                "Provider ID is required."

        });

    }


    const providerQuery = `

        SELECT

            epp.id AS provider_id,

            epp.user_id,

            epp.business_name,

            epp.business_description,

            epp.phone,

            epp.district,

            epp.approval_status

        FROM equipment_provider_profiles epp

        INNER JOIN users u
            ON u.id = epp.user_id

        WHERE

            epp.id = ?

            AND

            epp.approval_status = 'approved'
            AND u.is_active = 1
            AND u.removed_at IS NULL

    `;


    db.query(
        providerQuery,
        [providerId],
        (providerError, providerResults) => {

            if (providerError) {

                console.error(
                    "Get provider details error:",
                    providerError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load provider details."

                });

            }


            if (
                providerResults.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Rental provider not found."

                });

            }


            const provider =
                providerResults[0];


            const equipmentQuery = `

                SELECT

                    id AS equipment_id,

                    provider_id,

                    equipment_name,

                    category,

                    quantity,

                    garage_quantity,

                    description,

                    rental_price,

                    price_unit,

                    availability_status,

                    image,

                    created_at,

                    (
                        SELECT COALESCE(SUM(r.quantity), 0)
                        FROM rentals r
                        WHERE r.equipment_id = equipment.id
                          AND r.status NOT IN ('pending','rejected','cancelled')
                          AND r.completed_by_provider_at IS NULL
                    ) AS rented_quantity

                FROM equipment

                WHERE provider_id = ?

                ORDER BY equipment_name ASC

            `;


            db.query(
                equipmentQuery,
                [providerId],
                (equipmentError, equipmentResults) => {

                    if (equipmentError) {

                        console.error(
                            "Get provider equipment error:",
                            equipmentError
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Failed to load provider equipment."

                        });

                    }


                    return res.status(200).json({

                        success: true,

                        provider:
                            provider,

                        equipment:
                            equipmentResults

                    });

                }
            );

        }
    );

};


// =====================================================
// GET SINGLE EQUIPMENT DETAILS
//
// GET /api/rentals/equipment/:equipmentId
// =====================================================

const getEquipmentDetails = (req, res) => {

    const equipmentId =
        req.params.equipmentId;


    if (!equipmentId) {

        return res.status(400).json({

            success: false,

            message:
                "Equipment ID is required."

        });

    }


    const query = `

        SELECT

            e.id AS equipment_id,

            e.provider_id,

            e.equipment_name,

            e.category,

            e.quantity,

            e.garage_quantity,

            e.description,

            e.rental_price,

            e.price_unit,

            e.availability_status,

            e.image,

            e.created_at,

            epp.business_name,

            epp.business_description,

            epp.phone,

            epp.district

        FROM equipment e

        INNER JOIN equipment_provider_profiles epp
            ON e.provider_id = epp.id

        INNER JOIN users u
            ON u.id = epp.user_id

        WHERE

            e.id = ?

            AND

            epp.approval_status = 'approved'
            AND u.is_active = 1
            AND u.removed_at IS NULL

    `;


    db.query(
        query,
        [equipmentId],
        (error, results) => {

            if (error) {

                console.error(
                    "Get equipment details error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load equipment details."

                });

            }


            if (
                results.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Equipment not found."

                });

            }


            return res.status(200).json({

                success: true,

                equipment:
                    results[0]

            });

        }
    );

};


// =====================================================
// UPDATE EQUIPMENT (EDIT)
//
// PUT /api/rentals/equipment/:equipmentId
// =====================================================

const updateEquipment = (req, res) => {

    const equipmentId = req.params.equipmentId;

    const {
        equipment_name,
        category,
        quantity,
        description,
        rental_price,
        price_unit
    } = req.body;

    if (!equipmentId) {
        return res.status(400).json({ success: false, message: "Equipment ID is required." });
    }

    if (!equipment_name || !category || rental_price === undefined || rental_price === "" || !price_unit) {
        return res.status(400).json({ success: false, message: "Equipment name, category, rental price and price unit are required." });
    }

    const parsedQuantity = Number(quantity);
    const finalQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? Math.floor(parsedQuantity) : 1;

    let imagePath = null;

    if (req.file) {

        const rawPath = String(req.file.path || "").replace(/\\/g, "/");
        const uploadsIndex = rawPath.indexOf("uploads/");

        imagePath = uploadsIndex >= 0
            ? "/" + rawPath.substring(uploadsIndex)
            : "/uploads/equipment/" + req.file.filename;

    }

    // First, confirm this equipment exists and get its current garage_quantity
    // so we can keep garage units within the new total if it was reduced.
    db.query(
        `SELECT quantity, garage_quantity FROM equipment WHERE id = ?`,
        [equipmentId],
        (findErr, findResults) => {

            if (findErr) {
                console.error("Update equipment lookup error:", findErr);
                return res.status(500).json({ success: false, message: "Failed to update equipment." });
            }

            if (findResults.length === 0) {
                return res.status(404).json({ success: false, message: "Equipment not found." });
            }

            const currentGarageQuantity = findResults[0].garage_quantity || 0;
            const adjustedGarageQuantity = Math.min(currentGarageQuantity, finalQuantity);

            const fields = [
                "equipment_name = ?",
                "category = ?",
                "quantity = ?",
                "garage_quantity = ?",
                "description = ?",
                "rental_price = ?",
                "price_unit = ?"
            ];

            const values = [
                String(equipment_name).trim(),
                String(category).trim(),
                finalQuantity,
                adjustedGarageQuantity,
                description ? String(description).trim() : null,
                rental_price,
                price_unit
            ];

            if (imagePath) {
                fields.push("image = ?");
                values.push(imagePath);
            }

            values.push(equipmentId);

            const updateQuery = `UPDATE equipment SET ${fields.join(", ")} WHERE id = ?`;

            db.query(
                updateQuery,
                values,
                (updateErr) => {

                    if (updateErr) {
                        console.error("Update equipment error:", updateErr);
                        return res.status(500).json({ success: false, message: "Failed to update equipment." });
                    }

                    return res.status(200).json({
                        success: true,
                        message: "Equipment updated successfully."
                    });

                }
            );

        }
    );

};


// =====================================================
// SET GARAGE / MAINTENANCE QUANTITY
//
// PUT /api/rentals/equipment/:equipmentId/garage
// =====================================================

const setGarageQuantity = (req, res) => {

    const equipmentId = req.params.equipmentId;
    const garageQuantity = Number(req.body.garage_quantity);

    if (!equipmentId) {
        return res.status(400).json({ success: false, message: "Equipment ID is required." });
    }

    if (!Number.isFinite(garageQuantity) || garageQuantity < 0) {
        return res.status(400).json({ success: false, message: "A valid garage quantity is required." });
    }

    db.query(
        `SELECT quantity FROM equipment WHERE id = ?`,
        [equipmentId],
        (findErr, findResults) => {

            if (findErr) {
                console.error("Set garage quantity lookup error:", findErr);
                return res.status(500).json({ success: false, message: "Failed to update garage quantity." });
            }

            if (findResults.length === 0) {
                return res.status(404).json({ success: false, message: "Equipment not found." });
            }

            const totalQuantity = findResults[0].quantity;

            if (garageQuantity > totalQuantity) {
                return res.status(400).json({
                    success: false,
                    message: `Garage quantity cannot exceed the total quantity (${totalQuantity}).`
                });
            }

            db.query(
                `UPDATE equipment SET garage_quantity = ? WHERE id = ?`,
                [Math.floor(garageQuantity), equipmentId],
                (updateErr) => {

                    if (updateErr) {
                        console.error("Set garage quantity error:", updateErr);
                        return res.status(500).json({ success: false, message: "Failed to update garage quantity." });
                    }

                    return res.status(200).json({
                        success: true,
                        message: "Garage quantity updated successfully."
                    });

                }
            );

        }
    );

};


// =====================================================
// DELETE EQUIPMENT (ALL UNITS)
//
// DELETE /api/rentals/equipment/:equipmentId
// =====================================================

const deleteEquipment = (req, res) => {

    const equipmentId = req.params.equipmentId;

    if (!equipmentId) {
        return res.status(400).json({ success: false, message: "Equipment ID is required." });
    }

    db.query(
        `DELETE FROM equipment WHERE id = ?`,
        [equipmentId],
        (error, result) => {

            if (error) {
                console.error("Delete equipment error:", error);
                return res.status(500).json({ success: false, message: "Failed to delete equipment." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Equipment not found." });
            }

            return res.status(200).json({
                success: true,
                message: "Equipment deleted successfully."
            });

        }
    );

};


// =====================================================
// REDUCE EQUIPMENT QUANTITY (PARTIAL DELETE)
//
// PATCH /api/rentals/equipment/:equipmentId/reduce
// =====================================================

const reduceEquipmentQuantity = (req, res) => {

    const equipmentId = req.params.equipmentId;
    const reduceBy = Number(req.body.reduce_by);

    if (!equipmentId) {
        return res.status(400).json({ success: false, message: "Equipment ID is required." });
    }

    if (!Number.isFinite(reduceBy) || reduceBy <= 0) {
        return res.status(400).json({ success: false, message: "A valid quantity to remove is required." });
    }

    db.query(
        `SELECT quantity, garage_quantity FROM equipment WHERE id = ?`,
        [equipmentId],
        (findErr, findResults) => {

            if (findErr) {
                console.error("Reduce quantity lookup error:", findErr);
                return res.status(500).json({ success: false, message: "Failed to update equipment." });
            }

            if (findResults.length === 0) {
                return res.status(404).json({ success: false, message: "Equipment not found." });
            }

            const currentQuantity = findResults[0].quantity;
            const currentGarageQuantity = findResults[0].garage_quantity || 0;

            if (reduceBy > currentQuantity) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot remove more than the current quantity (${currentQuantity}).`
                });
            }

            const newQuantity = currentQuantity - Math.floor(reduceBy);

            if (newQuantity <= 0) {

                db.query(
                    `DELETE FROM equipment WHERE id = ?`,
                    [equipmentId],
                    (deleteErr) => {

                        if (deleteErr) {
                            console.error("Reduce quantity (delete) error:", deleteErr);
                            return res.status(500).json({ success: false, message: "Failed to update equipment." });
                        }

                        return res.status(200).json({
                            success: true,
                            message: "All units removed - equipment listing deleted.",
                            deleted: true
                        });

                    }
                );

                return;

            }

            const newGarageQuantity = Math.min(currentGarageQuantity, newQuantity);

            db.query(
                `UPDATE equipment SET quantity = ?, garage_quantity = ? WHERE id = ?`,
                [newQuantity, newGarageQuantity, equipmentId],
                (updateErr) => {

                    if (updateErr) {
                        console.error("Reduce quantity error:", updateErr);
                        return res.status(500).json({ success: false, message: "Failed to update equipment." });
                    }

                    return res.status(200).json({
                        success: true,
                        message: "Quantity updated successfully.",
                        deleted: false,
                        remaining_quantity: newQuantity
                    });

                }
            );

        }
    );

};


// =====================================================
// CREATE NEW EQUIPMENT
//
// POST /api/rentals/equipment
//
// The current equipment table contains:
//
// provider_id
// equipment_name
// category
// description
// rental_price
// price_unit
// availability_status
// image
//
// It does NOT contain:
//
// quantity
// brand_model
// year_of_purchase
// =====================================================

// =====================================================
// CREATE NEW EQUIPMENT
//
// POST /api/rentals/equipment
//
// The frontend sends:
//
// user_id
// equipment_name
// category
// description
// rental_price
// price_unit
// availability_status
//
// The backend finds the approved
// equipment_provider_profiles.id using users.id.
//
// =====================================================

const createEquipment = (req, res) => {

    const {
        user_id,
        provider_id,
        equipment_name,
        category,
        description,
        rental_price,
        price_unit,
        availability_status,
        quantity
    } = req.body;


    // =================================================
    // ACCEPT user_id AS THE PRIMARY IDENTIFIER
    //
    // provider_id is kept temporarily for compatibility
    // with older frontend code.
    // =================================================

    const loggedInUserId =
        user_id ||
        null;


    // =================================================
    // REQUIRED FIELDS
    // =================================================

    if (
        !loggedInUserId &&
        !provider_id
    ) {

        return res.status(400).json({

            success: false,

            message:
                "User ID is required."

        });

    }


    if (
        !equipment_name ||
        !category ||
        rental_price === undefined ||
        rental_price === null ||
        rental_price === "" ||
        !price_unit
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Equipment name, category, rental price and price unit are required."

        });

    }


    // =================================================
    // VALIDATE EQUIPMENT NAME
    // =================================================

    const equipmentName =
        String(
            equipment_name
        )
        .trim();


    if (!equipmentName) {

        return res.status(400).json({

            success: false,

            message:
                "Equipment name is required."

        });

    }


    if (
        equipmentName.length > 150
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Equipment name cannot exceed 150 characters."

        });

    }


    // =================================================
    // VALIDATE CATEGORY
    // =================================================

    const equipmentCategory =
        String(
            category
        )
        .trim();


    if (!equipmentCategory) {

        return res.status(400).json({

            success: false,

            message:
                "Equipment category is required."

        });

    }


    if (
        equipmentCategory.length > 100
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Equipment category cannot exceed 100 characters."

        });

    }


    // =================================================
    // VALIDATE RENTAL PRICE
    // =================================================

    const rentalPrice =
        Number(
            rental_price
        );


    if (
        !Number.isFinite(
            rentalPrice
        ) ||
        rentalPrice < 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Rental price must be a valid non-negative number."

        });

    }


    // =================================================
    // VALIDATE PRICE UNIT
    // =================================================

    const priceUnit =
        String(
            price_unit
        )
        .trim();


    if (!priceUnit) {

        return res.status(400).json({

            success: false,

            message:
                "Price unit is required."

        });

    }


    if (
        priceUnit.length > 50
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Price unit cannot exceed 50 characters."

        });

    }


    // =================================================
    // AVAILABILITY STATUS
    // =================================================

    const availabilityStatus =
        String(
            availability_status ||
            "available"
        )
        .trim()
        .toLowerCase();


    const allowedAvailability = [

        "available",

        "rented",

        "unavailable"

    ];


    if (
        !allowedAvailability.includes(
            availabilityStatus
        )
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid availability status."

        });

    }


    // =================================================
    // IMAGE
    // =================================================

    let imagePath =
        null;


    if (
        req.file
    ) {

        const rawPath =
            String(
                req.file.path ||
                ""
            )
            .replace(
                /\\/g,
                "/"
            );


        if (
            rawPath
        ) {

            const uploadsIndex =
                rawPath.indexOf(
                    "uploads/"
                );


            if (
                uploadsIndex >= 0
            ) {

                imagePath =
                    "/" +
                    rawPath.substring(
                        uploadsIndex
                    );

            }

            else {

                imagePath =
                    "/uploads/equipment/" +
                    req.file.filename;

            }

        }

        else {

            imagePath =
                "/uploads/equipment/" +
                req.file.filename;

        }

    }

    else if (
        req.body.image
    ) {

        imagePath =
            String(
                req.body.image
            )
            .trim() ||
            null;

    }


    // =================================================
    // FIND APPROVED EQUIPMENT PROVIDER
    // =================================================

    const providerQuery = `

        SELECT

            epp.id AS provider_id,

            epp.user_id,

            epp.business_name,

            epp.approval_status

        FROM equipment_provider_profiles epp

        INNER JOIN users u
            ON u.id = epp.user_id

        WHERE

            epp.approval_status = 'approved'
            AND u.is_active = 1
            AND u.removed_at IS NULL

            AND

            (
                epp.user_id = ?

                OR

                epp.id = ?
            )

        LIMIT 1

    `;


    /*
     * If user_id is supplied:
     *
     *   user_id = users.id
     *
     * If an old frontend still supplies provider_id:
     *
     *   id = equipment_provider_profiles.id
     */

    const providerUserId =
        loggedInUserId ||
        null;


    const providerProfileId =
        provider_id ||
        null;


    db.query(
        providerQuery,
        [
            providerUserId,
            providerProfileId
        ],
        (
            providerError,
            providerResults
        ) => {

            if (
                providerError
            ) {

                console.error(
                    "Verify equipment provider error:",
                    providerError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to verify Equipment Provider."

                });

            }


            // =================================================
            // NO APPROVED PROVIDER
            // =================================================

            if (
                providerResults.length === 0
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "No approved Equipment Provider profile was found for this account."

                });

            }


            const provider =
                providerResults[0];


            // =================================================
            // INSERT EQUIPMENT
            // =================================================

            const insertQuery = `

                INSERT INTO equipment
                (
                    provider_id,
                    equipment_name,
                    category,
                    quantity,
                    description,
                    rental_price,
                    price_unit,
                    availability_status,
                    image
                )

                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

            `;


            const parsedQuantity =
                Number(quantity);

            const finalQuantity =
                Number.isFinite(parsedQuantity) && parsedQuantity > 0
                    ? Math.floor(parsedQuantity)
                    : 1;


            const insertValues = [

                provider.provider_id,

                equipmentName,

                equipmentCategory,

                finalQuantity,

                description
                    ? String(
                        description
                    ).trim()
                    : null,

                rentalPrice,

                priceUnit,

                availabilityStatus,

                imagePath

            ];


            db.query(
                insertQuery,
                insertValues,
                (
                    insertError,
                    result
                ) => {

                    if (
                        insertError
                    ) {

                        console.error(
                            "Create equipment database error:",
                            insertError
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Failed to add equipment."

                        });

                    }


                    // =================================================
                    // RETURN CREATED EQUIPMENT
                    // =================================================

                    const equipmentId =
                        result.insertId;


                    const getCreatedQuery = `

                        SELECT

                            id AS equipment_id,

                            provider_id,

                            equipment_name,

                            category,

                            quantity,

                    garage_quantity,

                            description,

                            rental_price,

                            price_unit,

                            availability_status,

                            image,

                            created_at

                        FROM equipment

                        WHERE

                            id = ?

                        LIMIT 1

                    `;


                    db.query(
                        getCreatedQuery,
                        [equipmentId],
                        (
                            selectError,
                            equipmentResults
                        ) => {

                            if (
                                selectError
                            ) {

                                console.error(
                                    "Get created equipment error:",
                                    selectError
                                );

                                return res.status(201).json({

                                    success: true,

                                    message:
                                        "Equipment added successfully.",

                                    equipment: {

                                        equipment_id:
                                            equipmentId,

                                        provider_id:
                                            provider.provider_id,

                                        equipment_name:
                                            equipmentName,

                                        category:
                                            equipmentCategory,

                                        quantity:
                                            finalQuantity,

                                        description:
                                            description
                                                ? String(
                                                    description
                                                ).trim()
                                                : null,

                                        rental_price:
                                            rentalPrice,

                                        price_unit:
                                            priceUnit,

                                        availability_status:
                                            availabilityStatus,

                                        image:
                                            imagePath

                                    }

                                });

                            }


                            return res.status(201).json({

                                success: true,

                                message:
                                    "Equipment added successfully.",

                                equipment:
                                    equipmentResults[0]

                            });

                        }
                    );

                }
            );

        }
    );

};


// =====================================================
// CREATE RENTAL REQUEST
//
// POST /api/rentals
// =====================================================

const createRental = (req, res) => {

    const {
        equipment_id,
        renter_id,
        quantity,
        start_date,
        end_date
    } = req.body;


    if (
        !equipment_id ||
        !renter_id ||
        !quantity ||
        !start_date ||
        !end_date
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Equipment, renter, quantity, start date and end date are required."

        });

    }


    const requestedQuantity =
        Number(quantity);


    if (
        !Number.isInteger(
            requestedQuantity
        ) ||
        requestedQuantity <= 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Quantity must be a positive whole number."

        });

    }


    const equipmentQuery = `

        SELECT

            e.id,

            e.provider_id,

            e.rental_price,

            e.price_unit,

            e.availability_status,

            e.equipment_name,

            epp.business_name,

            epp.user_id AS provider_user_id

        FROM equipment e

        INNER JOIN equipment_provider_profiles epp
            ON e.provider_id = epp.id

        INNER JOIN users u
            ON u.id = epp.user_id

        WHERE

            e.id = ?

            AND epp.approval_status = 'approved'
            AND u.is_active = 1
            AND u.removed_at IS NULL

    `;


    db.query(
        equipmentQuery,
        [equipment_id],
        (equipmentError, equipmentResults) => {

            if (equipmentError) {

                console.error(
                    "Check equipment error:",
                    equipmentError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to check equipment."

                });

            }


            if (
                equipmentResults.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Equipment not found or provider is not approved."

                });

            }


            const equipment =
                equipmentResults[0];


            if (
                equipment.availability_status !==
                "available"
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This equipment is currently unavailable."

                });

            }


            const startDate =
                new Date(
                    `${start_date}T00:00:00`
                );


            const endDate =
                new Date(
                    `${end_date}T00:00:00`
                );


            const today =
                new Date();


            today.setHours(
                0,
                0,
                0,
                0
            );


            if (
                Number.isNaN(
                    startDate.getTime()
                ) ||
                Number.isNaN(
                    endDate.getTime()
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid rental dates."

                });

            }


            if (
                startDate < today
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Start date cannot be before the current date."

                });

            }


            if (
                endDate < startDate
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "End date cannot be before start date."

                });

            }


            const millisecondsPerDay =
                1000 *
                60 *
                60 *
                24;


            const rentalDays =
                Math.floor(
                    (
                        endDate -
                        startDate
                    ) /
                    millisecondsPerDay
                ) + 1;


            const rentalPrice =
                Number(
                    equipment.rental_price
                );


            if (
                !Number.isFinite(
                    rentalPrice
                ) ||
                rentalPrice < 0
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Invalid rental price for this equipment."

                });

            }


            const priceUnit =
                (
                    equipment.price_unit ||
                    ""
                ).toLowerCase();


            let totalAmount;


            if (
                priceUnit.includes(
                    "week"
                )
            ) {

                const weeks =
                    Math.ceil(
                        rentalDays / 7
                    );


                totalAmount =
                    rentalPrice *
                    weeks *
                    requestedQuantity;

            }

            else {

                totalAmount =
                    rentalPrice *
                    rentalDays *
                    requestedQuantity;

            }


            const conflictQuery = `

                SELECT

                    COALESCE(
                        SUM(quantity),
                        0
                    ) AS reserved_quantity

                FROM rentals

                WHERE

                    equipment_id = ?

                    AND status IN
                    (
                        'pending',
                        'approved',
                        'delivered',
                        'received'
                    )

                    AND start_date <= ?

                    AND end_date >= ?

            `;


            db.query(
                conflictQuery,
                [
                    equipment_id,
                    end_date,
                    start_date
                ],
                (conflictError, conflictResults) => {

                    if (conflictError) {

                        console.error(
                            "Rental conflict check error:",
                            conflictError
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Failed to check rental availability."

                        });

                    }


                    const reservedQuantity =
                        Number(
                            conflictResults[0]?.reserved_quantity ||
                            0
                        );


                    if (
                        reservedQuantity > 0
                    ) {

                        return res.status(409).json({

                            success: false,

                            message:
                                "This equipment is already requested or rented for the selected dates."

                        });

                    }


                    const insertQuery = `

                        INSERT INTO rentals
                        (
                            equipment_id,
                            renter_id,
                            provider_id,
                            quantity,
                            start_date,
                            end_date,
                            total_amount,
                            status
                        )

                        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')

                    `;


                    db.query(
                        insertQuery,
                        [
                            equipment_id,
                            renter_id,
                            equipment.provider_id,
                            requestedQuantity,
                            start_date,
                            end_date,
                            totalAmount
                        ],
                        (insertError, result) => {

                            if (insertError) {

                                console.error(
                                    "Create rental error:",
                                    insertError
                                );

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "Failed to create rental request."

                                });

                            }


                            // Fire-and-forget: notify the provider of a new rental request.
                            createNotification({
                                userId: equipment.provider_user_id,
                                type: "rental",
                                title: "New rental request",
                                message: `You have a new rental request for ${equipment.equipment_name}.`,
                                relatedType: "rental",
                                relatedId: result.insertId
                            });


                            return res.status(201).json({

                                success: true,

                                message:
                                    "Rental request submitted successfully.",

                                rental: {

                                    id:
                                        result.insertId,

                                    equipment_id:
                                        Number(
                                            equipment_id
                                        ),

                                    renter_id:
                                        Number(
                                            renter_id
                                        ),

                                    provider_id:
                                        Number(
                                            equipment.provider_id
                                        ),

                                    quantity:
                                        requestedQuantity,

                                    equipment_name:
                                        equipment.equipment_name,

                                    business_name:
                                        equipment.business_name,

                                    start_date:
                                        start_date,

                                    end_date:
                                        end_date,

                                    rental_days:
                                        rentalDays,

                                    total_amount:
                                        Number(
                                            totalAmount.toFixed(2)
                                        ),

                                    status:
                                        "pending"

                                }

                            });

                        }
                    );

                }
            );

        }
    );

};


// =====================================================
// GET RENTALS FOR AN EQUIPMENT PROVIDER
//
// GET /api/rentals/provider/:providerId
// =====================================================

const getProviderRentals = (req, res) => {

    const providerId =
        req.params.providerId;


    if (!providerId) {

        return res.status(400).json({

            success: false,

            message:
                "Provider ID is required."

        });

    }


    const query = `

        SELECT

            r.id AS rental_id,

            r.equipment_id,

            r.renter_id,

            r.provider_id,

            r.quantity,

            r.start_date,

            r.end_date,

            r.total_amount,

            r.status,

            r.completed_by_farmer_at,

            r.completed_by_provider_at,

            r.created_at,

            e.equipment_name,

            e.category,

            e.rental_price,

            e.price_unit,

            e.image,

            u.first_name AS renter_first_name,

            u.last_name AS renter_last_name,

            u.phone AS renter_phone,

            u.email AS renter_email

        FROM rentals r

        INNER JOIN equipment e
            ON r.equipment_id = e.id

        INNER JOIN users u
            ON r.renter_id = u.id

        WHERE r.provider_id = ?

        ORDER BY

            CASE

                WHEN r.status = 'pending'
                THEN 1

                WHEN r.status = 'approved'
                THEN 2

                WHEN r.status = 'delivered'
                THEN 3

                WHEN r.status = 'received'
                THEN 4

                WHEN r.status = 'returned'
                THEN 5

                WHEN r.status = 'provider_received'
                THEN 6

                WHEN r.status = 'rejected'
                THEN 7

                ELSE 8

            END,

            r.created_at DESC

    `;


    db.query(
        query,
        [providerId],
        (error, results) => {

            if (error) {

                console.error(
                    "Get provider rentals error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load provider rental requests."

                });

            }


            return res.status(200).json({

                success: true,

                rentals:
                    results

            });

        }
    );

};


// =====================================================
// UPDATE RENTAL STATUS
// =====================================================

const updateRentalStatus = (req, res) => {

    const rentalId =
        req.params.rentalId;


    const {
        status,
        provider_id,
        renter_id
    } = req.body;


    const allowedStatuses = [

        "approved",

        "rejected",

        "cancelled",

        "delivered",

        "received",

        "returned",

        "provider_received"

    ];


    if (
        !rentalId ||
        !status
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Rental ID and status are required."

        });

    }


    if (
        !allowedStatuses.includes(
            status
        )
    ) {

        console.log("DEBUG - received status:", JSON.stringify(status), "| type:", typeof status, "| allowedStatuses:", JSON.stringify(allowedStatuses));

        return res.status(400).json({

            success: false,

            message:
                `Invalid rental status. Received: ${JSON.stringify(status)}`

        });

    }


    let query = `

        SELECT

            r.id,

            r.equipment_id,

            r.renter_id,

            r.provider_id,

            r.quantity,

            r.start_date,

            r.end_date,

            r.status

        FROM rentals r

        WHERE r.id = ?

    `;


    const params = [
        rentalId
    ];


    if (
        provider_id
    ) {

        query += `

            AND r.provider_id = ?

        `;

        params.push(
            provider_id
        );

    }


    query += `
        LIMIT 1
    `;


    db.query(
        query,
        params,
        (error, results) => {

            if (error) {

                console.error(
                    "Get rental before status update error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load rental."

                });

            }


            if (
                results.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Rental not found."

                });

            }


            const rental =
                results[0];


            if (
                status === "cancelled" &&
                renter_id &&
                Number(rental.renter_id) !== Number(renter_id)
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You can only cancel your own rental requests."

                });

            }


            const currentStatus =
                rental.status;


            const validTransition =

                (
                    currentStatus ===
                    "pending"

                    &&

                    (
                        status ===
                        "approved"

                        ||

                        status ===
                        "rejected"

                        ||

                        status ===
                        "cancelled"
                    )
                )

                ||

                (
                    currentStatus ===
                    "approved"

                    &&

                    status ===
                    "delivered"
                )

                ||

                (
                    currentStatus ===
                    "delivered"

                    &&

                    status ===
                    "received"
                )

                ||

                (
                    currentStatus ===
                    "received"

                    &&

                    status ===
                    "returned"
                )

                ||

                (
                    currentStatus ===
                    "returned"

                    &&

                    status ===
                    "provider_received"
                );


            if (
                !validTransition
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        `Cannot change rental status from ${currentStatus} to ${status}.`

                });

            }


            if (
                status ===
                "approved"
            ) {

                const availabilityQuery = `

                    SELECT

                        id

                    FROM rentals

                    WHERE

                        equipment_id = ?

                        AND id <> ?

                        AND status IN
                        (
                            'approved',
                            'delivered',
                            'received'
                        )

                        AND start_date <= ?

                        AND end_date >= ?

                    LIMIT 1

                `;


                db.query(
                    availabilityQuery,
                    [
                        rental.equipment_id,
                        rental.id,
                        rental.end_date,
                        rental.start_date
                    ],
                    (
                        availabilityError,
                        availabilityResults
                    ) => {

                        if (
                            availabilityError
                        ) {

                            console.error(
                                "Approval availability check error:",
                                availabilityError
                            );

                            return res.status(500).json({

                                success: false,

                                message:
                                    "Failed to check equipment availability."

                            });

                        }


                        if (
                            availabilityResults.length > 0
                        ) {

                            return res.status(409).json({

                                success: false,

                                message:
                                    "This equipment is already approved or rented for overlapping dates."

                            });

                        }


                        updateStatus();

                    }
                );

            }

            else {

                updateStatus();

            }


            function updateStatus() {

                const updateQuery = `

                    UPDATE rentals

                    SET status = ?

                    WHERE id = ?

                `;


                db.query(
                    updateQuery,
                    [
                        status,
                        rental.id
                    ],
                    (
                        updateError,
                        updateResult
                    ) => {

                        if (
                            updateError
                        ) {

                            console.error(
                                "Update rental status error:",
                                updateError
                            );

                            return res.status(500).json({

                                success: false,

                                message:
                                    "Failed to update rental status."

                            });

                        }


                        if (
                            updateResult.affectedRows === 0
                        ) {

                            return res.status(404).json({

                                success: false,

                                message:
                                    "Rental not found."

                            });

                        }


                        // Notify whichever party did NOT initiate this
                        // change - provider-initiated steps notify the
                        // farmer, farmer-initiated steps notify the provider.
                        const farmerInitiatedStatuses = [
                            "received",
                            "returned",
                            "cancelled"
                        ];

                        const statusMessages = {

                            approved: `Your rental request #${rental.id} has been accepted by the provider.`,
                            rejected: `Your rental request #${rental.id} has been rejected by the provider.`,
                            delivered: `Your equipment for rental #${rental.id} has been delivered.`,
                            provider_received: `The provider has confirmed receiving the equipment back for rental #${rental.id}.`,
                            received: `The farmer has confirmed receiving the equipment for rental #${rental.id}.`,
                            returned: `The farmer has returned the equipment for rental #${rental.id}.`,
                            cancelled: `Rental request #${rental.id} was cancelled by the farmer before it was accepted.`

                        };

                        const notificationTitle =
                            status === "cancelled"
                                ? "Rental request cancelled"
                                : "Rental status updated";

                        const notificationMessage =
                            statusMessages[status] ||
                            `Rental #${rental.id} is now ${status}.`;

                        if (farmerInitiatedStatuses.includes(status)) {

                            // Fire-and-forget: notify the provider.
                            db.query(
                                `SELECT user_id FROM equipment_provider_profiles WHERE id = ? LIMIT 1`,
                                [rental.provider_id],
                                (providerErr, providerResults) => {

                                    if (providerErr) {
                                        console.error("Provider lookup for status notice error:", providerErr);
                                        return;
                                    }

                                    if (providerResults.length > 0) {

                                        createNotification({
                                            userId: providerResults[0].user_id,
                                            type: "rental",
                                            title: notificationTitle,
                                            message: notificationMessage,
                                            relatedType: "rental",
                                            relatedId: rental.id
                                        });

                                    }

                                }
                            );

                        } else {

                            // Fire-and-forget: notify the renter.
                            createNotification({
                                userId: rental.renter_id,
                                type: "rental",
                                title: notificationTitle,
                                message: notificationMessage,
                                relatedType: "rental",
                                relatedId: rental.id
                            });

                        }


                        return res.status(200).json({

                            success: true,

                            message:
                                `Rental ${status} successfully.`,

                            rental: {

                                id:
                                    rental.id,

                                status:
                                    status,

                                quantity:
                                    Number(
                                        rental.quantity
                                    )

                            }

                        });

                    }
                );

            }

        }
    );

};


// =====================================================
// COMPLETE A RENTAL (per-side, after provider_received)
//
// PUT /api/rentals/:rentalId/complete
// Body: { user_id }
//
// Either the farmer (renter) or the provider may mark their
// own side complete, independently of the other.
// =====================================================

const completeRental = (req, res) => {

    const rentalId = req.params.rentalId;
    const userId = req.body && req.body.user_id;

    if (!rentalId || !userId) {
        return res.status(400).json({ success: false, message: "Rental ID and user ID are required." });
    }

    const rentalQuery = `
        SELECT r.*, epp.user_id AS provider_user_id
        FROM rentals r
        INNER JOIN equipment_provider_profiles epp ON epp.id = r.provider_id
        WHERE r.id = ?
        LIMIT 1
    `;

    db.query(
        rentalQuery,
        [rentalId],
        (error, results) => {

            if (error) {
                console.error("Complete rental lookup error:", error);
                return res.status(500).json({ success: false, message: "Failed to load rental." });
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: "Rental not found." });
            }

            const rental = results[0];

            const isFarmer = Number(rental.renter_id) === Number(userId);
            const isProvider = Number(rental.provider_user_id) === Number(userId);

            if (!isFarmer && !isProvider) {
                return res.status(403).json({ success: false, message: "You are not part of this rental." });
            }

            if (rental.status !== "provider_received") {
                return res.status(400).json({
                    success: false,
                    message: "This rental cannot be completed yet - the provider must confirm receiving the equipment back first."
                });
            }

            const column = isFarmer ? "completed_by_farmer_at" : "completed_by_provider_at";
            const otherColumn = isFarmer ? "completed_by_provider_at" : "completed_by_farmer_at";

            db.query(
                `UPDATE rentals SET ${column} = CURRENT_TIMESTAMP WHERE id = ?`,
                [rentalId],
                (updateErr) => {

                    if (updateErr) {
                        console.error("Complete rental update error:", updateErr);
                        return res.status(500).json({ success: false, message: "Failed to complete rental." });
                    }

                    // Fire-and-forget: notify the other party this side is done.
                    createNotification({
                        userId: isFarmer ? rental.provider_user_id : rental.renter_id,
                        type: "rental",
                        title: "Rental marked as completed",
                        message: isFarmer
                            ? `The farmer marked rental #${rental.id} as completed on their side.`
                            : `The provider marked rental #${rental.id} as completed on their side.`,
                        relatedType: "rental",
                        relatedId: rental.id
                    });

                    const otherAlreadyCompleted = !!rental[otherColumn];

                    if (otherAlreadyCompleted) {

                        db.query(
                            `UPDATE rentals SET status = 'completed' WHERE id = ?`,
                            [rentalId],
                            (finalErr) => {

                                if (finalErr) {
                                    console.error("Finalize rental completion error:", finalErr);
                                }

                                return res.status(200).json({
                                    success: true,
                                    message: "Rental marked as completed.",
                                    bothCompleted: true
                                });

                            }
                        );

                        return;

                    }

                    return res.status(200).json({
                        success: true,
                        message: "Rental marked as completed on your side.",
                        bothCompleted: false
                    });

                }
            );

        }
    );

};


// =====================================================
// GET MY ACTIVE / PENDING RENTALS
// =====================================================

const getMyRentals = (req, res) => {

    const renterId =
        req.params.renterId;


    if (!renterId) {

        return res.status(400).json({

            success: false,

            message:
                "Renter ID is required."

        });

    }


    const query = `

        SELECT

            r.id AS rental_id,

            r.equipment_id,

            r.renter_id,

            r.provider_id,

            r.quantity,

            r.start_date,

            r.end_date,

            r.total_amount,

            r.status,

            r.completed_by_farmer_at,

            r.completed_by_provider_at,

            r.created_at,

            e.equipment_name,

            e.category,

            e.description,

            e.rental_price,

            e.price_unit,

            e.image,

            epp.business_name,

            epp.phone AS provider_phone,

            epp.district AS provider_location,

            epp.user_id AS provider_user_id

        FROM rentals r

        INNER JOIN equipment e
            ON r.equipment_id = e.id

        INNER JOIN equipment_provider_profiles epp
            ON r.provider_id = epp.id

        WHERE

            r.renter_id = ?

            AND

            r.status IN
            (
                'pending',
                'approved',
                'delivered',
                'received',
                'returned',
                'provider_received'
            )

        ORDER BY
            r.created_at DESC

    `;


    db.query(
        query,
        [renterId],
        (error, results) => {

            if (error) {

                console.error(
                    "Get my rentals error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load your rentals."

                });

            }


            return res.status(200).json({

                success: true,

                rentals:
                    results

            });

        }
    );

};


// =====================================================
// GET RENTAL HISTORY
// =====================================================

const getRentalHistory = (req, res) => {

    const renterId =
        req.params.renterId;


    if (!renterId) {

        return res.status(400).json({

            success: false,

            message:
                "Renter ID is required."

        });

    }


    const query = `

        SELECT

            r.id AS rental_id,

            r.equipment_id,

            r.renter_id,

            r.provider_id,

            r.quantity,

            r.start_date,

            r.end_date,

            r.total_amount,

            r.status,

            r.created_at,

            e.equipment_name,

            e.category,

            e.description,

            e.rental_price,

            e.price_unit,

            e.image,

            epp.business_name,

            epp.phone AS provider_phone,

            epp.district AS provider_location

        FROM rentals r

        INNER JOIN equipment e
            ON r.equipment_id = e.id

        INNER JOIN equipment_provider_profiles epp
            ON r.provider_id = epp.id

        WHERE

            r.renter_id = ?

            AND

            r.status IN
            (
                'rejected',
                'completed',
                'cancelled'
            )

        ORDER BY
            r.created_at DESC

    `;


    db.query(
        query,
        [renterId],
        (error, results) => {

            if (error) {

                console.error(
                    "Get rental history error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load rental history."

                });

            }


            return res.status(200).json({

                success: true,

                rentals:
                    results

            });

        }
    );

};


// =====================================================
// GET SINGLE RENTAL
// =====================================================

const getRentalById = (req, res) => {

    const rentalId =
        req.params.rentalId;


    if (!rentalId) {

        return res.status(400).json({

            success: false,

            message:
                "Rental ID is required."

        });

    }


    const query = `

        SELECT

            r.id AS rental_id,

            r.equipment_id,

            r.renter_id,

            r.provider_id,

            r.quantity,

            r.start_date,

            r.end_date,

            r.total_amount,

            r.status,

            r.created_at,

            e.equipment_name,

            e.category,

            e.description,

            e.rental_price,

            e.price_unit,

            e.availability_status,

            e.image,

            epp.business_name,

            epp.business_description,

            epp.phone AS provider_phone,

            epp.district AS provider_location

        FROM rentals r

        INNER JOIN equipment e
            ON r.equipment_id = e.id

        INNER JOIN equipment_provider_profiles epp
            ON r.provider_id = epp.id

        WHERE r.id = ?

    `;


    db.query(
        query,
        [rentalId],
        (error, results) => {

            if (error) {

                console.error(
                    "Get rental error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load rental."

                });

            }


            if (
                results.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Rental not found."

                });

            }


            return res.status(200).json({

                success: true,

                rental:
                    results[0]

            });

        }
    );

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

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

};