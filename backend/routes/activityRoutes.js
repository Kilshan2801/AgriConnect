const express = require("express");

const {
    getActivities,
    createActivity,
    updateActivity,
    updateActivityStatus,
    deleteActivity
} = require("../controllers/activityController");

const router = express.Router();


router.get(
    "/",
    getActivities
);

router.post(
    "/",
    createActivity
);

router.put(
    "/:id",
    updateActivity
);

router.put(
    "/:id/status",
    updateActivityStatus
);

router.delete(
    "/:id",
    deleteActivity
);


module.exports = router;
