const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
    startConversation,
    getConversations,
    getMessages,
    sendMessage,
    completeConsultation,
    reopenConsultation,
    getUnreadCount
} = require("../controllers/messageController");

const router = express.Router();


const messageUploadDirectory =
    path.join(__dirname, "../../uploads/messages");

if (!fs.existsSync(messageUploadDirectory)) {
    fs.mkdirSync(messageUploadDirectory, { recursive: true });
}

const messageStorage =
    multer.diskStorage({

        destination: function (req, file, cb) {
            cb(null, messageUploadDirectory);
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

const upload = multer({ storage: messageStorage });


// =====================================================
// START OR RESUME A CONVERSATION
//
// POST /api/messages/conversations/start
// =====================================================

router.post(
    "/conversations/start",
    startConversation
);


// =====================================================
// LIST MY CONVERSATIONS
//
// GET /api/messages/conversations?user_id=&context_type=
// =====================================================

router.get(
    "/conversations",
    getConversations
);


// =====================================================
// GET MESSAGES IN A CONVERSATION
//
// GET /api/messages/conversations/:id/messages?user_id=
// =====================================================

router.get(
    "/conversations/:id/messages",
    getMessages
);


// =====================================================
// SEND A MESSAGE
//
// POST /api/messages/conversations/:id/messages
// =====================================================

router.post(
    "/conversations/:id/messages",
    upload.single("attachment"),
    sendMessage
);


// =====================================================
// MARK A CONSULTATION AS COMPLETED
//
// PUT /api/messages/conversations/:id/complete
// =====================================================

router.put(
    "/conversations/:id/complete",
    completeConsultation
);


// =====================================================
// REOPEN A CONSULTATION (after both sides completed it)
//
// PUT /api/messages/conversations/:id/reopen
// =====================================================

router.put(
    "/conversations/:id/reopen",
    reopenConsultation
);


// =====================================================
// UNREAD COUNT
//
// GET /api/messages/unread-count?user_id=
// =====================================================

router.get(
    "/unread-count",
    getUnreadCount
);


module.exports = router;
