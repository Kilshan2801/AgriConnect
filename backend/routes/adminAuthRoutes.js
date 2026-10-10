const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const express = require("express");
const crypto = require("crypto");

const router = express.Router();


/*
=========================================================
ADMIN LOGIN (server-side check)

POST /api/auth/admin-login
Body: { email, password }

Credentials come from .env (ADMIN_EMAIL, ADMIN_PASSWORD),
so no password lives in the frontend or in GitHub.
=========================================================
*/

// Compare two strings without leaking timing information
function safeEqual(a, b) {

    const hashA = crypto.createHash("sha256").update(String(a)).digest();
    const hashB = crypto.createHash("sha256").update(String(b)).digest();

    return crypto.timingSafeEqual(hashA, hashB);

}


// Very small brute-force guard: 5 failed attempts per IP, then 5 min lock
const attempts = {};
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;


router.post("/admin-login", (req, res) => {

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {

        return res.status(500).json({
            success: false,
            message: "Admin login is not configured on the server."
        });

    }

    const ip = req.ip;
    const record = attempts[ip];

    if (record && record.count >= MAX_ATTEMPTS && Date.now() - record.last < LOCK_MS) {

        return res.status(429).json({
            success: false,
            message: "Too many failed attempts. Try again in a few minutes."
        });

    }

    const email = String((req.body && req.body.email) || "").trim().toLowerCase();
    const password = String((req.body && req.body.password) || "");

    const valid =
        safeEqual(email, adminEmail.toLowerCase()) &&
        safeEqual(password, adminPassword);

    if (!valid) {

        attempts[ip] = {
            count: (record && Date.now() - record.last < LOCK_MS ? record.count : 0) + 1,
            last: Date.now()
        };

        return res.status(401).json({
            success: false,
            message: "Invalid administrator email or password."
        });

    }

    delete attempts[ip];

    return res.status(200).json({ success: true });

});


module.exports = router;
