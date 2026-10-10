const express = require("express");
const path = require("path");
const fs = require("fs");

const db = require("./db");

const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cropRoutes = require("./routes/cropRoutes");
const rentalRoutes = require("./routes/rentalRoutes");
const consultationRoutes = require("./routes/consultationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const activityRoutes = require("./routes/activityRoutes");
const historyRoutes = require("./routes/historyRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const app = express();

const PORT = 5000;


// =====================================================
// MIDDLEWARE
// =====================================================

// Read JSON request bodies
app.use(
    express.json()
);


// Read form data
app.use(
    express.urlencoded({
        extended: true
    })
);


// =====================================================
// SERVE UPLOADED FILES
// =====================================================

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "../uploads"
        )
    )
);


// Fallback for files uploaded before the upload-path fix (they
// ended up in backend/uploads/ instead of the folder above, and
// were saved without a file extension). This serves them from
// their original location and detects PNG/JPEG/PDF from the
// file's own bytes so the browser still renders them correctly.
app.get(
    "/uploads/:filename",
    (req, res, next) => {

        const fallbackPath =
            path.join(__dirname, "uploads", req.params.filename);

        if (!fs.existsSync(fallbackPath)) {
            return next();
        }

        fs.readFile(fallbackPath, (err, data) => {

            if (err) {
                return next();
            }

            let contentType = "application/octet-stream";

            if (data.length >= 4) {

                if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
                    contentType = "image/png";
                } else if (data[0] === 0xff && data[1] === 0xd8) {
                    contentType = "image/jpeg";
                } else if (data.slice(0, 4).toString() === "%PDF") {
                    contentType = "application/pdf";
                } else if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
                    contentType = "image/gif";
                }

            }

            res.setHeader("Content-Type", contentType);
            res.send(data);

        });

    }
);


// =====================================================
// SERVE FRONTEND FILES
// =====================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "../frontend"
        )
    )
);


// =====================================================
// API ROUTES
// =====================================================


// -----------------------------------------------------
// Authentication routes
// -----------------------------------------------------

app.use(
    "/api/auth",
    authRoutes
);


// -----------------------------------------------------
// Order routes
// -----------------------------------------------------

app.use(
    "/api/orders",
    orderRoutes
);


// -----------------------------------------------------
// Crop routes
// -----------------------------------------------------

app.use(
    "/api/crops",
    cropRoutes
);


// -----------------------------------------------------
// Rental routes
// -----------------------------------------------------

app.use(
    "/api/rentals",
    rentalRoutes
);


app.use(
    "/api/consultations",
    consultationRoutes
);


app.use(
    "/api/reports",
    reportRoutes
);

app.use(
    "/api/admin",
    adminRoutes
);

app.use(
    "/api/auth", 
    require("./routes/adminAuthRoutes")
);

app.use(
    "/api/messages",
    messageRoutes
);

app.use(
    "/api/notifications",
    notificationRoutes
);

app.use(
    "/api/activities",
    activityRoutes
);

app.use(
    "/api/history",
    historyRoutes
);

app.use(
    "/api/resources",
    resourceRoutes
);

app.use(
    "/api/settings",
    settingsRoutes
);


// =====================================================
// HOME PAGE
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/index.html"
            )
        );

    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            `AgriConnect server running on http://localhost:${PORT}`
        );

    }
);