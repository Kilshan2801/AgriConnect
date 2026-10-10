const db = require("../db");
const { createNotification } = require("./notificationController");

// =====================================================
// MESSAGES + CONSULTATION CHAT
// =====================================================
//
// Backs three frontend surfaces that were previously
// static mock data with no server behind them:
//
//   - Farmer  messages.html          (tabs: Buyers / Rentals / Experts)
//   - Buyer   buyer-messages.html    (farmers they ordered from)
//   - Provider rental-messages.html  (farmers who rented their equipment)
//   - Expert  expert-consultations.html (farmers who asked a question)
//
// All four are the SAME underlying thread model:
//
//   conversations (user_one_id, user_two_id, context_type, context_id)
//   messages      (conversation_id, sender_id, receiver_id, text, ...)
//
// context_type tells us why two users are allowed to talk:
//   'order'        -> buyer  <-> farmer   (must share a row in `orders`)
//   'rental'       -> farmer <-> provider (must share a row in `rentals`)
//   'consultation' -> farmer <-> expert   (expert must be approved)
//   'general'      -> reserved, not opened by any current flow
//
// user_one_id is always the smaller numeric id so a given pair only
// ever has one conversation row per context (matches the UNIQUE key
// on the conversations table).
// =====================================================


// ---------------------------------------------------
// helpers
// ---------------------------------------------------

function orderPair(a, b) {
    return a < b ? [a, b] : [b, a];
}

function query(sql, params) {
    return db.promise().query(sql, params);
}

async function userHasRole(userId, role) {
    const [rows] = await query(
        `SELECT id FROM user_roles WHERE user_id = ? AND role = ? LIMIT 1`,
        [userId, role]
    );
    return rows.length > 0;
}

async function isApprovedExpert(userId) {
    const [rows] = await query(
        `SELECT id FROM expert_profiles WHERE user_id = ? AND approval_status = 'approved' LIMIT 1`,
        [userId]
    );
    return rows.length > 0;
}

async function getUserBasic(userId) {
    const [rows] = await query(
        `SELECT id, first_name, last_name, email, phone FROM users WHERE id = ? LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
}

// Confirms the two users are actually allowed to open/use a thread
// for the given context. Throws { status, message } on failure.
async function assertRelationshipAllowed(userOneId, userTwoId, contextType, contextId) {

    if (contextType === "order") {

        // A buyer and a farmer may message about a specific order,
        // or about their relationship in general (context_id null is
        // allowed, but if given it must actually belong to both users).
        const [rows] = await query(
            `SELECT id FROM orders
             WHERE ((buyer_id = ? AND farmer_id = ?) OR (buyer_id = ? AND farmer_id = ?))
             ${contextId ? "AND id = ?" : ""}
             LIMIT 1`,
            contextId
                ? [userOneId, userTwoId, userTwoId, userOneId, contextId]
                : [userOneId, userTwoId, userTwoId, userOneId]
        );

        if (rows.length === 0) {
            const err = new Error("No order exists between these two users.");
            err.status = 403;
            throw err;
        }

        return;
    }

    if (contextType === "rental") {

        // NOTE: rentals.provider_id stores equipment_provider_profiles.id,
        // NOT users.id (that's how rentalController.js models it - see
        // `ON e.provider_id = epp.id` used throughout that file). So a
        // renter<->provider check has to join through that profile table
        // to translate back to the provider's actual user id.
        const [rows] = await query(
            `SELECT rt.id FROM rentals rt
             INNER JOIN equipment_provider_profiles epp ON rt.provider_id = epp.id
             WHERE (
                (rt.renter_id = ? AND epp.user_id = ?) OR
                (rt.renter_id = ? AND epp.user_id = ?)
             )
             ${contextId ? "AND rt.id = ?" : ""}
             LIMIT 1`,
            contextId
                ? [userOneId, userTwoId, userTwoId, userOneId, contextId]
                : [userOneId, userTwoId, userTwoId, userOneId]
        );

        if (rows.length === 0) {
            const err = new Error("No equipment rental exists between these two users.");
            err.status = 403;
            throw err;
        }

        return;
    }

    if (contextType === "consultation") {

        // One side must be an approved expert. The other side starts
        // the conversation (normally a farmer, but we don't hard-block
        // other roles from asking a question).
        const oneIsExpert = await isApprovedExpert(userOneId);
        const twoIsExpert = await isApprovedExpert(userTwoId);

        if (!oneIsExpert && !twoIsExpert) {
            const err = new Error("Consultations can only be opened with an approved Agricultural Expert.");
            err.status = 403;
            throw err;
        }

        return;
    }

    // 'general' - no relationship required.
}

async function findOrCreateConversation(userOneId, userTwoId, contextType, contextId) {

    const [existing] = await query(
        `SELECT * FROM conversations
         WHERE user_one_id = ? AND user_two_id = ? AND context_type = ?
         AND context_id ${contextId ? "= ?" : "IS NULL"}
         LIMIT 1`,
        contextId
            ? [userOneId, userTwoId, contextType, contextId]
            : [userOneId, userTwoId, contextType]
    );

    if (existing.length > 0) {
        return existing[0];
    }

    const [result] = await query(
        `INSERT INTO conversations (user_one_id, user_two_id, context_type, context_id)
         VALUES (?, ?, ?, ?)`,
        [userOneId, userTwoId, contextType, contextId || null]
    );

    const [created] = await query(
        `SELECT * FROM conversations WHERE id = ?`,
        [result.insertId]
    );

    return created[0];
}


// =====================================================
// START (OR RESUME) A CONVERSATION
//
// POST /api/messages/conversations/start
// Body: { user_id, other_user_id, context_type, context_id? }
// =====================================================

exports.startConversation = async (req, res) => {

    try {

        const { user_id, other_user_id, context_type, context_id } = req.body || {};

        if (!user_id || !other_user_id || !context_type) {
            return res.status(400).json({
                success: false,
                message: "user_id, other_user_id and context_type are required."
            });
        }

        if (Number(user_id) === Number(other_user_id)) {
            return res.status(400).json({
                success: false,
                message: "You cannot start a conversation with yourself."
            });
        }

        if (!["order", "rental", "consultation", "general"].includes(context_type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid context_type."
            });
        }

        const [userOneId, userTwoId] = orderPair(Number(user_id), Number(other_user_id));

        await assertRelationshipAllowed(userOneId, userTwoId, context_type, context_id || null);

        const conversation = await findOrCreateConversation(
            userOneId, userTwoId, context_type, context_id || null
        );

        const otherUser = await getUserBasic(other_user_id);

        return res.status(200).json({
            success: true,
            conversation: {
                id: conversation.id,
                context_type: conversation.context_type,
                context_id: conversation.context_id,
                other_user: otherUser
            }
        });

    } catch (err) {

        console.error("startConversation error:", err);

        return res.status(err.status || 500).json({
            success: false,
            message: err.status ? err.message : "Failed to start conversation."
        });

    }

};


// =====================================================
// LIST MY CONVERSATIONS
//
// GET /api/messages/conversations?user_id=&context_type=
// =====================================================

exports.getConversations = async (req, res) => {

    try {

        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const contextFilter = req.query.context_type;

        const [rows] = await query(
            `SELECT
                c.id,
                c.context_type,
                c.context_id,
                c.completed_at,
                CASE WHEN c.user_one_id = ? THEN c.completed_by_user_one_at ELSE c.completed_by_user_two_at END AS my_completed_at,
                CASE WHEN c.user_one_id = ? THEN c.completed_by_user_two_at ELSE c.completed_by_user_one_at END AS other_completed_at,
                c.last_message_at,
                c.created_at,
                CASE WHEN c.user_one_id = ? THEN c.user_two_id ELSE c.user_one_id END AS other_user_id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                (
                    SELECT message_text FROM messages
                    WHERE conversation_id = c.id
                    ORDER BY created_at DESC LIMIT 1
                ) AS last_message_text,
                (
                    SELECT COUNT(*) FROM messages
                    WHERE conversation_id = c.id
                    AND receiver_id = ?
                    AND is_read = 0
                ) AS unread_count
             FROM conversations c
             INNER JOIN users u
                ON u.id = CASE WHEN c.user_one_id = ? THEN c.user_two_id ELSE c.user_one_id END
             WHERE (c.user_one_id = ? OR c.user_two_id = ?)
             ${contextFilter ? "AND c.context_type = ?" : ""}
             ORDER BY (c.last_message_at IS NULL), c.last_message_at DESC, c.created_at DESC`,
            contextFilter
                ? [userId, userId, userId, userId, userId, userId, userId, contextFilter]
                : [userId, userId, userId, userId, userId, userId, userId]
        );

        return res.json({ success: true, conversations: rows });

    } catch (err) {

        console.error("getConversations error:", err);
        return res.status(500).json({ success: false, message: "Failed to load conversations." });

    }

};


// =====================================================
// GET MESSAGES IN A CONVERSATION (marks them read)
//
// GET /api/messages/conversations/:id/messages?user_id=
// =====================================================

exports.getMessages = async (req, res) => {

    try {

        const conversationId = req.params.id;
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const [convRows] = await query(
            `SELECT * FROM conversations WHERE id = ? LIMIT 1`,
            [conversationId]
        );

        if (convRows.length === 0) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const conversation = convRows[0];

        if (
            Number(conversation.user_one_id) !== Number(userId) &&
            Number(conversation.user_two_id) !== Number(userId)
        ) {
            return res.status(403).json({ success: false, message: "You are not part of this conversation." });
        }

        const [messages] = await query(
            `SELECT id, sender_id, receiver_id, message_text, attachment, is_read, created_at
             FROM messages
             WHERE conversation_id = ?
             ORDER BY created_at ASC`,
            [conversationId]
        );

        await query(
            `UPDATE messages SET is_read = 1
             WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0`,
            [conversationId, userId]
        );

        return res.json({ success: true, conversation, messages });

    } catch (err) {

        console.error("getMessages error:", err);
        return res.status(500).json({ success: false, message: "Failed to load messages." });

    }

};


// =====================================================
// SEND A MESSAGE
//
// POST /api/messages/conversations/:id/messages
// Body: { sender_id, message_text, attachment? }
// =====================================================

exports.sendMessage = async (req, res) => {

    try {

        const conversationId = req.params.id;
        const { sender_id, message_text } = req.body || {};

        let attachment = null;

        if (req.file) {

            const rawPath = String(req.file.path || "").replace(/\\/g, "/");
            const uploadsIndex = rawPath.indexOf("uploads/");

            attachment =
                uploadsIndex >= 0
                    ? "/" + rawPath.substring(uploadsIndex)
                    : "/uploads/messages/" + req.file.filename;

        }

        if (!sender_id || (!message_text && !attachment)) {
            return res.status(400).json({
                success: false,
                message: "sender_id and message_text (or an attachment) are required."
            });
        }

        const [convRows] = await query(
            `SELECT * FROM conversations WHERE id = ? LIMIT 1`,
            [conversationId]
        );

        if (convRows.length === 0) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const conversation = convRows[0];

        const senderIsOne = Number(conversation.user_one_id) === Number(sender_id);
        const senderIsTwo = Number(conversation.user_two_id) === Number(sender_id);

        if (!senderIsOne && !senderIsTwo) {
            return res.status(403).json({ success: false, message: "You are not part of this conversation." });
        }

        if (conversation.context_type === "consultation" && conversation.completed_at) {
            return res.status(409).json({
                success: false,
                message: "This consultation has been completed by both sides. Start a new consultation to continue messaging.",
                consultationCompleted: true
            });
        }

        const receiverId = senderIsOne ? conversation.user_two_id : conversation.user_one_id;

        const [result] = await query(
            `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text, attachment)
             VALUES (?, ?, ?, ?, ?)`,
            [conversationId, sender_id, receiverId, message_text || null, attachment || null]
        );

        await query(
            `UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [conversationId]
        );

        const [created] = await query(
            `SELECT id, sender_id, receiver_id, message_text, attachment, is_read, created_at
             FROM messages WHERE id = ?`,
            [result.insertId]
        );

        // Fire-and-forget: notify the receiver. Never blocks or fails the send.
        //
        // For consultations specifically: only the very FIRST message in
        // a brand-new conversation creates a notification (worded as a
        // new consultation request). Follow-up messages in an existing
        // consultation don't notify - the Consultations page's own badge
        // already covers those, and repeating it here would be noise.
        if (conversation.context_type === "consultation") {

            query(
                `SELECT COUNT(*) AS message_count FROM messages WHERE conversation_id = ?`,
                [conversationId]
            ).then(([countRows]) => {

                const isFirstMessage = Number(countRows[0].message_count) === 1;

                if (!isFirstMessage) {
                    return;
                }

                getUserBasic(sender_id).then((sender) => {
                    createNotification({
                        userId: receiverId,
                        type: "consultation",
                        title: "New consultation request",
                        message: `${sender ? `${sender.first_name} ${sender.last_name}` : "A farmer"} wants to consult with you.`,
                        relatedType: "conversation",
                        relatedId: conversationId
                    });
                }).catch((err) => console.error("notify sendMessage error:", err));

            }).catch((err) => console.error("check first message error:", err));

        } else {

            getUserBasic(sender_id).then((sender) => {
                createNotification({
                    userId: receiverId,
                    type: "message",
                    title: "New message",
                    message: `${sender ? `${sender.first_name} ${sender.last_name}` : "Someone"} sent you a message.`,
                    relatedType: "conversation",
                    relatedId: conversationId
                });
            }).catch((err) => console.error("notify sendMessage error:", err));

        }

        return res.status(201).json({ success: true, message: created[0] });

    } catch (err) {

        console.error("sendMessage error:", err);
        return res.status(500).json({ success: false, message: "Failed to send message." });

    }

};


// =====================================================
// MARK A CONSULTATION AS COMPLETED
//
// PUT /api/messages/conversations/:id/complete
// Body: { user_id }
//
// Only meaningful for context_type = 'consultation' (feeds
// the expert's History page). Either participant may mark
// it complete.
// =====================================================

exports.completeConsultation = async (req, res) => {

    try {

        const conversationId = req.params.id;
        const userId = req.body && req.body.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const [rows] = await query(
            `SELECT * FROM conversations WHERE id = ? LIMIT 1`,
            [conversationId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const conversation = rows[0];

        const isUserOne = Number(conversation.user_one_id) === Number(userId);
        const isUserTwo = Number(conversation.user_two_id) === Number(userId);

        if (!isUserOne && !isUserTwo) {
            return res.status(403).json({ success: false, message: "You are not part of this conversation." });
        }

        if (conversation.context_type !== "consultation") {
            return res.status(400).json({ success: false, message: "Only consultations can be marked completed." });
        }

        const column = isUserOne ? "completed_by_user_one_at" : "completed_by_user_two_at";
        const otherColumn = isUserOne ? "completed_by_user_two_at" : "completed_by_user_one_at";

        await query(
            `UPDATE conversations SET ${column} = CURRENT_TIMESTAMP WHERE id = ?`,
            [conversationId]
        );

        // If the other participant had already marked it complete too,
        // this conversation is now fully completed by both sides.
        const otherAlreadyCompleted = !!conversation[otherColumn];

        if (otherAlreadyCompleted) {
            await query(
                `UPDATE conversations SET completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [conversationId]
            );
        }

        return res.json({
            success: true,
            message: "Consultation marked as completed.",
            bothCompleted: otherAlreadyCompleted
        });

    } catch (err) {

        console.error("completeConsultation error:", err);
        return res.status(500).json({ success: false, message: "Failed to update consultation." });

    }

};


// =====================================================
// REOPEN A CONSULTATION (start a new one with the same
// participants, after both sides had marked it completed)
//
// PUT /api/messages/conversations/:id/reopen
// Body: { user_id }
// =====================================================

exports.reopenConsultation = async (req, res) => {

    try {

        const conversationId = req.params.id;
        const userId = req.body && req.body.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const [rows] = await query(
            `SELECT * FROM conversations WHERE id = ? LIMIT 1`,
            [conversationId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const conversation = rows[0];

        if (
            Number(conversation.user_one_id) !== Number(userId) &&
            Number(conversation.user_two_id) !== Number(userId)
        ) {
            return res.status(403).json({ success: false, message: "You are not part of this conversation." });
        }

        if (!conversation.completed_at) {
            return res.status(400).json({ success: false, message: "This consultation is not marked completed by both sides yet." });
        }

        await query(
            `UPDATE conversations
             SET completed_at = NULL,
                 completed_by_user_one_at = NULL,
                 completed_by_user_two_at = NULL
             WHERE id = ?`,
            [conversationId]
        );

        return res.json({ success: true, message: "Consultation reopened." });

    } catch (err) {

        console.error("reopenConsultation error:", err);
        return res.status(500).json({ success: false, message: "Failed to reopen consultation." });

    }

};


// =====================================================
// UNREAD COUNT (for a notification-style badge)
//
// GET /api/messages/unread-count?user_id=
// =====================================================

exports.getUnreadCount = async (req, res) => {

    try {

        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "user_id is required." });
        }

        const [rows] = await query(
            `SELECT COUNT(*) AS unread FROM messages WHERE receiver_id = ? AND is_read = 0`,
            [userId]
        );

        return res.json({ success: true, unread: rows[0].unread });

    } catch (err) {

        console.error("getUnreadCount error:", err);
        return res.status(500).json({ success: false, message: "Failed to load unread count." });

    }

};
