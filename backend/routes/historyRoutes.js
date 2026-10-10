const express = require("express");

const { getMyHistory } = require("../controllers/historyController");

const router = express.Router();

router.get(
    "/",
    getMyHistory
);

module.exports = router;
