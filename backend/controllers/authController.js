const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const db = require("../db");

const { createNotification } = require("./notificationController");

function notifyAdmins(title, message, relatedId) {

    db.query(
        `SELECT u.id FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         WHERE ur.role = 'admin'`,
        (err, admins) => {

            if (err || !admins) return;

            admins.forEach(admin => {

                createNotification({
                    userId: admin.id,
                    type: "registration",
                    title,
                    message,
                    relatedType: "registration",
                    relatedId
                });

            });

        }
    );

}


// =====================================================
// REGISTER USER / ADD NEW ROLE
// =====================================================

const registerUser = async (req, res) => {

    try {

        const {
            first_name,
            last_name,
            phone,
            email,
            district,
            password,
            role,
            specialization,
            business_name
        } = req.body;


        // -------------------------------------------------
        // 1. Check common required fields
        // -------------------------------------------------

        if (
            !first_name ||
            !last_name ||
            !phone ||
            !district ||
            !password ||
            !role
        ) {

            return res.status(400).json({
                message:
                    "Please fill all required fields."
            });

        }


        // -------------------------------------------------
        // 2. Admin cannot register publicly
        // -------------------------------------------------

        if (role === "admin") {

            return res.status(403).json({
                message:
                    "Admin registration is not allowed."
            });

        }


        // -------------------------------------------------
        // 3. Email is optional
        // -------------------------------------------------

        const userEmail =
            email &&
            email.trim() !== ""
                ? email.trim()
                : null;


        // -------------------------------------------------
        // 4. Find existing user
        // -------------------------------------------------

        let existingUsers;


        if (userEmail) {

            [existingUsers] =
                await db.promise().query(
                    `SELECT *
                     FROM users
                     WHERE email = ?
                     OR phone = ?`,
                    [
                        userEmail,
                        phone
                    ]
                );

        } else {

            [existingUsers] =
                await db.promise().query(
                    `SELECT *
                     FROM users
                     WHERE phone = ?`,
                    [phone]
                );

        }


        // -------------------------------------------------
        // 5. Prevent email and phone belonging
        //    to different users
        // -------------------------------------------------

        if (existingUsers.length > 1) {

            return res.status(409).json({
                message:
                    "The email and phone number belong to different accounts."
            });

        }


        // =================================================
        // EXISTING USER
        // =================================================

        if (existingUsers.length === 1) {

            const existingUser =
                existingUsers[0];


            // ---------------------------------------------
            // Check password to confirm ownership
            // ---------------------------------------------

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    existingUser.password
                );


            if (!passwordMatch) {

                return res.status(401).json({
                    message:
                        "An account already exists with this email/phone. Please use the correct password."
                });

            }


            // ---------------------------------------------
            // Check whether requested role already exists
            // ---------------------------------------------

            const [existingRole] =
                await db.promise().query(
                    `SELECT id
                     FROM user_roles
                     WHERE user_id = ?
                     AND role = ?`,
                    [
                        existingUser.id,
                        role
                    ]
                );


            if (existingRole.length > 0) {

                return res.status(409).json({
                    message:
                        `You already have a ${role.replace("_", " ")} account.`
                });

            }


            // ---------------------------------------------
            // Add the new role
            // ---------------------------------------------

            await db.promise().query(
                `INSERT INTO user_roles
                 (user_id, role)
                 VALUES (?, ?)`,
                [
                    existingUser.id,
                    role
                ]
            );


            // ---------------------------------------------
            // Make sure Buyer role exists
            // ---------------------------------------------

            if (role !== "buyer") {

                const [buyerRole] =
                    await db.promise().query(
                        `SELECT id
                         FROM user_roles
                         WHERE user_id = ?
                         AND role = 'buyer'`,
                        [existingUser.id]
                    );


                if (buyerRole.length === 0) {

                    await db.promise().query(
                        `INSERT INTO user_roles
                         (user_id, role)
                         VALUES (?, 'buyer')`,
                        [existingUser.id]
                    );

                }


                // -----------------------------------------
                // Make sure Buyer profile exists
                // -----------------------------------------

                const [buyerProfile] =
                    await db.promise().query(
                        `SELECT id
                         FROM buyer_profiles
                         WHERE user_id = ?`,
                        [existingUser.id]
                    );


                if (buyerProfile.length === 0) {

                    await db.promise().query(
                        `INSERT INTO buyer_profiles
                         (user_id, phone, district)
                         VALUES (?, ?, ?)`,
                        [
                            existingUser.id,
                            existingUser.phone,
                            district
                        ]
                    );

                }

            }


            // ---------------------------------------------
            // Farmer profile
            // ---------------------------------------------

            if (role === "farmer") {

                await db.promise().query(
                    `INSERT INTO farmer_profiles
                     (user_id, phone, district)
                     VALUES (?, ?, ?)`,
                    [
                        existingUser.id,
                        existingUser.phone,
                        district
                    ]
                );

            }


            // ---------------------------------------------
            // Buyer profile
            // ---------------------------------------------

            else if (role === "buyer") {

                await db.promise().query(
                    `INSERT INTO buyer_profiles
                     (user_id, phone, district)
                     VALUES (?, ?, ?)`,
                    [
                        existingUser.id,
                        existingUser.phone,
                        district
                    ]
                );

            }


            // ---------------------------------------------
            // Expert profile
            // ---------------------------------------------

            else if (role === "expert") {

                const certificationDocument =
                    req.files
                        ?.certification_document
                        ?.[0]?.filename;


                if (
                    !specialization ||
                    !certificationDocument
                ) {

                    return res.status(400).json({
                        message:
                            "Specialization and certification document are required."
                    });

                }


                await db.promise().query(
                    `INSERT INTO expert_profiles
                     (
                         user_id,
                         phone,
                         district,
                         specialization,
                         certification_document,
                         approval_status
                     )
                     VALUES (?, ?, ?, ?, ?, 'pending')`,
                    [
                        existingUser.id,
                        existingUser.phone,
                        district,
                        specialization,
                        certificationDocument
                    ]
                );


                // Add registration request

                await db.promise().query(
                    `INSERT INTO registrations
                     (
                         user_id,
                         registration_type,
                         status
                     )
                     VALUES (?, 'expert', 'pending')`,
                    [existingUser.id]
                );

                notifyAdmins(
                    "New Agricultural Expert registration",
                    `${existingUser.first_name || ""} ${existingUser.last_name || ""}`.trim() + " has applied to become an Agricultural Expert.",
                    existingUser.id
                );

            }


            // ---------------------------------------------
            // Equipment Provider profile
            // ---------------------------------------------

            else if (
                role === "equipment_provider"
            ) {

                const proofDocument =
                    req.files
                        ?.proof_document
                        ?.[0]?.filename;


                if (
                    !business_name ||
                    !proofDocument
                ) {

                    return res.status(400).json({
                        message:
                            "Rental/Company name and proof document are required."
                    });

                }


                await db.promise().query(
                    `INSERT INTO equipment_provider_profiles
                     (
                         user_id,
                         phone,
                         district,
                         business_name,
                         proof_document,
                         approval_status
                     )
                     VALUES (?, ?, ?, ?, ?, 'pending')`,
                    [
                        existingUser.id,
                        existingUser.phone,
                        district,
                        business_name,
                        proofDocument
                    ]
                );


                // Add registration request

                await db.promise().query(
                    `INSERT INTO registrations
                     (
                         user_id,
                         registration_type,
                         status
                     )
                     VALUES (?, 'equipment_provider', 'pending')`,
                    [existingUser.id]
                );

                notifyAdmins(
                    "New Equipment Provider registration",
                    `${existingUser.first_name || ""} ${existingUser.last_name || ""}`.trim() + " has applied to become an Equipment Provider.",
                    existingUser.id
                );

            }


            // ---------------------------------------------
            // Existing user success
            // ---------------------------------------------

            return res.status(201).json({

                message:
                    `Your ${role.replace("_", " ")} role has been added successfully.`,

                userId:
                    existingUser.id

            });

        }


        // =================================================
        // NEW USER
        // =================================================


        // -------------------------------------------------
        // Get NIC files
        // -------------------------------------------------

        const nicFront =
            req.files?.nic_front?.[0]?.filename;


        const nicBack =
            req.files?.nic_back?.[0]?.filename;


        if (
            !nicFront ||
            !nicBack
        ) {

            return res.status(400).json({
                message:
                    "NIC front and back images are required."
            });

        }


        // -------------------------------------------------
        // Validate Expert documents
        // -------------------------------------------------

        let certificationDocument =
            null;


        if (role === "expert") {

            certificationDocument =
                req.files
                    ?.certification_document
                    ?.[0]?.filename;


            if (
                !specialization ||
                !certificationDocument
            ) {

                return res.status(400).json({
                    message:
                        "Specialization and certification document are required."
                });

            }

        }


        // -------------------------------------------------
        // Validate Equipment Provider documents
        // -------------------------------------------------

        let proofDocument =
            null;


        if (
            role === "equipment_provider"
        ) {

            proofDocument =
                req.files
                    ?.proof_document
                    ?.[0]?.filename;


            if (
                !business_name ||
                !proofDocument
            ) {

                return res.status(400).json({
                    message:
                        "Rental/Company name and proof document are required."
                });

            }

        }


        // -------------------------------------------------
        // Hash password
        // -------------------------------------------------

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        // -------------------------------------------------
        // Create new user
        // -------------------------------------------------

        const [result] =
            await db.promise().query(
                `INSERT INTO users
                 (
                     first_name,
                     last_name,
                     phone,
                     email,
                     password,
                     nic_front,
                     nic_back
                 )
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    first_name,
                    last_name,
                    phone,
                    userEmail,
                    hashedPassword,
                    nicFront,
                    nicBack
                ]
            );


        const userId =
            result.insertId;


        // -------------------------------------------------
        // Add selected role
        // -------------------------------------------------

        await db.promise().query(
            `INSERT INTO user_roles
             (user_id, role)
             VALUES (?, ?)`,
            [
                userId,
                role
            ]
        );


        // -------------------------------------------------
        // Automatically add Buyer role
        // -------------------------------------------------

        if (role !== "buyer") {

            await db.promise().query(
                `INSERT INTO user_roles
                 (user_id, role)
                 VALUES (?, 'buyer')`,
                [userId]
            );

        }


        // -------------------------------------------------
        // Create Buyer profile
        // -------------------------------------------------

        if (role === "buyer") {

            await db.promise().query(
                `INSERT INTO buyer_profiles
                 (user_id, phone, district)
                 VALUES (?, ?, ?)`,
                [
                    userId,
                    phone,
                    district
                ]
            );

        }


        // -------------------------------------------------
        // Automatically create Buyer profile
        // for Farmer / Expert / Provider
        // -------------------------------------------------

        if (role !== "buyer") {

            await db.promise().query(
                `INSERT INTO buyer_profiles
                 (user_id, phone, district)
                 VALUES (?, ?, ?)`,
                [
                    userId,
                    phone,
                    district
                ]
            );

        }


        // -------------------------------------------------
        // Farmer profile
        // -------------------------------------------------

        if (role === "farmer") {

            await db.promise().query(
                `INSERT INTO farmer_profiles
                 (user_id, phone, district)
                 VALUES (?, ?, ?)`,
                [
                    userId,
                    phone,
                    district
                ]
            );

        }


        // -------------------------------------------------
        // Expert profile
        // -------------------------------------------------

        if (role === "expert") {

            await db.promise().query(
                `INSERT INTO expert_profiles
                 (
                     user_id,
                     phone,
                     district,
                     specialization,
                     certification_document,
                     approval_status
                 )
                 VALUES (?, ?, ?, ?, ?, 'pending')`,
                [
                    userId,
                    phone,
                    district,
                    specialization,
                    certificationDocument
                ]
            );


            await db.promise().query(
                `INSERT INTO registrations
                 (
                     user_id,
                     registration_type,
                     status
                 )
                 VALUES (?, 'expert', 'pending')`,
                [userId]
            );

            notifyAdmins(
                "New Agricultural Expert registration",
                `${first_name || ""} ${last_name || ""}`.trim() + " has applied to become an Agricultural Expert.",
                userId
            );

        }


        // -------------------------------------------------
        // Equipment Provider profile
        // -------------------------------------------------

        if (
            role === "equipment_provider"
        ) {

            await db.promise().query(
                `INSERT INTO equipment_provider_profiles
                 (
                     user_id,
                     phone,
                     district,
                     business_name,
                     proof_document,
                     approval_status
                 )
                 VALUES (?, ?, ?, ?, ?, 'pending')`,
                [
                    userId,
                    phone,
                    district,
                    business_name,
                    proofDocument
                ]
            );


            await db.promise().query(
                `INSERT INTO registrations
                 (
                     user_id,
                     registration_type,
                     status
                 )
                 VALUES (?, 'equipment_provider', 'pending')`,
                [userId]
            );

            notifyAdmins(
                "New Equipment Provider registration",
                `${first_name || ""} ${last_name || ""}`.trim() + " has applied to become an Equipment Provider.",
                userId
            );

        }


        // -------------------------------------------------
        // Registration successful
        // -------------------------------------------------

        return res.status(201).json({

            message:
                "Registration successful.",

            userId:
                userId

        });


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        // -------------------------------------------------
        // Duplicate email / phone
        // -------------------------------------------------

        if (
            error.code ===
            "ER_DUP_ENTRY"
        ) {

            return res.status(409).json({
                message:
                    "An account already exists with this email or phone number."
            });

        }


        return res.status(500).json({
            message:
                "Server error during registration."
        });

    }

};


// =====================================================
// LOGIN
// =====================================================

const loginUser = async (req, res) => {

    try {

        const {
            identifier,
            password,
            role
        } = req.body;


        // -------------------------------------------------
        // Check required fields
        // -------------------------------------------------

        if (
            !identifier ||
            !password ||
            !role
        ) {

            return res.status(400).json({
                message:
                    "Email/Phone number, password and role are required."
            });

        }


        // -------------------------------------------------
        // Validate selected role
        // -------------------------------------------------

        const allowedRoles = [

            "farmer",

            "buyer",

            "expert",

            "equipment_provider"

        ];


        if (
            !allowedRoles.includes(role)
        ) {

            return res.status(400).json({
                message:
                    "Invalid login role."
            });

        }


        // -------------------------------------------------
        // Find user by email or phone
        // -------------------------------------------------

        let users;


        if (
            identifier.includes("@")
        ) {

            [users] =
                await db.promise().query(
                    `SELECT *
                     FROM users
                     WHERE email = ?`,
                    [identifier]
                );

        } else {

            [users] =
                await db.promise().query(
                    `SELECT *
                     FROM users
                     WHERE phone = ?`,
                    [identifier]
                );

        }


        // -------------------------------------------------
        // User not found
        // -------------------------------------------------

        if (
            users.length === 0
        ) {

            return res.status(401).json({
                message:
                    "Invalid email/phone number or password."
            });

        }


        const user =
            users[0];


        // -------------------------------------------------
        // Check password
        // -------------------------------------------------

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({
                message:
                    "Invalid email/phone number or password."
            });

        }


        // -------------------------------------------------
        // Check account has not been paused/removed by admin
        // -------------------------------------------------

        if (
            user.is_active === 0
        ) {

            return res.status(403).json({
                message:
                    user.removed_at
                        ? "This account has been removed by an administrator."
                        : "This account has been paused by an administrator. Please contact support."
            });

        }


        // -------------------------------------------------
        // Get user's roles
        // -------------------------------------------------

        const [roles] =
            await db.promise().query(
                `SELECT role
                 FROM user_roles
                 WHERE user_id = ?`,
                [user.id]
            );


        const userRoles =
            roles.map(
                item => item.role
            );


        // -------------------------------------------------
        // Check whether selected role belongs
        // to this user
        // -------------------------------------------------

        if (
            !userRoles.includes(role)
        ) {

            return res.status(403).json({
                message:
                    `You do not have a ${role.replace("_", " ")} account.`
            });

        }


        // -------------------------------------------------
        // Get Expert approval status
        // -------------------------------------------------

        let expertStatus =
            null;


        if (
            userRoles.includes("expert")
        ) {

            const [expert] =
                await db.promise().query(
                    `SELECT approval_status
                     FROM expert_profiles
                     WHERE user_id = ?`,
                    [user.id]
                );


            if (
                expert.length > 0
            ) {

                expertStatus =
                    expert[0].approval_status;

            }

        }


        // -------------------------------------------------
        // Get Equipment Provider approval status
        // -------------------------------------------------

        let providerStatus =
            null;


        if (
            userRoles.includes(
                "equipment_provider"
            )
        ) {

            const [provider] =
                await db.promise().query(
                    `SELECT approval_status
                     FROM equipment_provider_profiles
                     WHERE user_id = ?`,
                    [user.id]
                );


            if (
                provider.length > 0
            ) {

                providerStatus =
                    provider[0].approval_status;

            }

        }


        // -------------------------------------------------
        // Check selected role approval
        // -------------------------------------------------

        if (
            role === "expert" &&
            expertStatus !== "approved"
        ) {

            return res.status(403).json({
                message:
                    `Your Agricultural Expert account is ${expertStatus || "pending"}. Please wait for administrator approval.`
            });

        }


        if (
            role === "equipment_provider" &&
            providerStatus !== "approved"
        ) {

            return res.status(403).json({
                message:
                    `Your Equipment Provider account is ${providerStatus || "pending"}. Please wait for administrator approval.`
            });

        }


        // -------------------------------------------------
        // Create JWT token
        // -------------------------------------------------

        const token =
            jwt.sign(
                {
                    id:
                        user.id,

                    roles:
                        userRoles,

                    selectedRole:
                        role
                },

                process.env.JWT_SECRET,

                {
                    expiresIn:
                        "1d"
                }
            );


        // -------------------------------------------------
        // Return login result
        // -------------------------------------------------

        return res.status(200).json({

            message:
                "Login successful.",

            token:
                token,

            user: {

                id:
                    user.id,

                first_name:
                    user.first_name,

                last_name:
                    user.last_name,

                email:
                    user.email,

                phone:
                    user.phone,

                roles:
                    userRoles,

                selected_role:
                    role,

                expert_status:
                    expertStatus,

                equipment_provider_status:
                    providerStatus

            }

        });

    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        return res.status(500).json({
            message:
                "Server error during login."
        });

    }

};


// =====================================================
// GET MY DISTRICT (for weather widget, etc.)
//
// GET /api/auth/my-district/:userId
// =====================================================

const getMyDistrict = async (req, res) => {

    const userId = req.params.userId;

    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required." });
    }

    try {

        const tables = [
            "farmer_profiles",
            "expert_profiles",
            "equipment_provider_profiles",
            "buyer_profiles"
        ];

        for (const table of tables) {

            try {

                const [rows] = await db.promise().query(
                    `SELECT district FROM ${table} WHERE user_id = ? LIMIT 1`,
                    [userId]
                );

                if (rows.length > 0 && rows[0].district) {
                    return res.status(200).json({
                        success: true,
                        district: rows[0].district
                    });
                }

            } catch (tableError) {
                // Table may not exist or may not have a district column - skip it.
                continue;
            }

        }

        return res.status(404).json({
            success: false,
            message: "No district found for this account."
        });

    } catch (error) {

        console.error("Get my district error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load district."
        });

    }

};


// =====================================================
// HEARTBEAT (marks the user as currently online)
//
// POST /api/auth/heartbeat
// Body: { user_id }
// =====================================================

const heartbeat = async (req, res) => {

    const userId = req.body && req.body.user_id;

    if (!userId) {
        return res.status(400).json({ success: false, message: "user_id is required." });
    }

    try {

        await db.promise().query(
            `UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [userId]
        );

        return res.status(200).json({ success: true });

    } catch (error) {

        console.error("Heartbeat error:", error);
        return res.status(500).json({ success: false, message: "Failed to record heartbeat." });

    }

};


// =====================================================
// ONLINE STATUS (is a user currently online?)
//
// GET /api/auth/online-status/:userId
//
// "Online" = seen within the last 2 minutes.
// =====================================================

const getOnlineStatus = async (req, res) => {

    const userId = req.params.userId;

    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required." });
    }

    try {

        const [rows] = await db.promise().query(
            `SELECT last_seen_at FROM users WHERE id = ? LIMIT 1`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const lastSeenAt = rows[0].last_seen_at;

        const online =
            !!lastSeenAt &&
            (Date.now() - new Date(lastSeenAt).getTime()) <= 2 * 60 * 1000;

        return res.status(200).json({
            success: true,
            online,
            last_seen_at: lastSeenAt
        });

    } catch (error) {

        console.error("Get online status error:", error);
        return res.status(500).json({ success: false, message: "Failed to check online status." });

    }

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    registerUser,

    loginUser,

    getMyDistrict,

    heartbeat,

    getOnlineStatus

};