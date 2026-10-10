const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");


const {
    addCrop,
    getFarmerCrops,
    getAllCrops,
    getCropById,
    updateCrop,
    deleteCrop
} = require("../controllers/cropController");


const router = express.Router();


// =====================================================
// CREATE UPLOAD FOLDER
// =====================================================

const uploadDirectory =
    path.join(
        __dirname,
        "../../uploads/crops"
    );


if (
    !fs.existsSync(uploadDirectory)
) {

    fs.mkdirSync(
        uploadDirectory,
        {
            recursive: true
        }
    );

}


// =====================================================
// MULTER STORAGE
// =====================================================

const storage =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                cb
            ) {

                cb(
                    null,
                    uploadDirectory
                );

            },


        filename:
            function (
                req,
                file,
                cb
            ) {

                const extension =
                    path.extname(
                        file.originalname
                    );


                const uniqueName =
                    `crop-${Date.now()}-${Math.round(Math.random() * 1000000)}${extension}`;


                cb(
                    null,
                    uniqueName
                );

            }

    });


// =====================================================
// FILE FILTER
// =====================================================

const fileFilter =
    function (
        req,
        file,
        cb
    ) {

        if (
            file.mimetype.startsWith(
                "image/"
            )
        ) {

            cb(
                null,
                true
            );

        }

        else {

            cb(
                new Error(
                    "Only image files are allowed."
                ),
                false
            );

        }

    };


// =====================================================
// MULTER UPLOAD
// =====================================================

const upload =
    multer({

        storage:
            storage,

        fileFilter:
            fileFilter,

        limits: {

            files: 10,

            fileSize:
                5 * 1024 * 1024

        }

    });


// =====================================================
// CROP ROUTES
// =====================================================


// -----------------------------------------------------
// Add new crop
// POST /api/crops
// -----------------------------------------------------

router.post(
    "/",
    upload.array(
        "cropImages",
        10
    ),
    addCrop
);


// -----------------------------------------------------
// Get all crops for buyers
// GET /api/crops
// -----------------------------------------------------

router.get(
    "/",
    getAllCrops
);


// -----------------------------------------------------
// Get all crops of a farmer
// GET /api/crops/farmer/:farmer_id
// -----------------------------------------------------

router.get(
    "/farmer/:farmer_id",
    getFarmerCrops
);


// -----------------------------------------------------
// Get one crop
// GET /api/crops/:id
// -----------------------------------------------------

router.get(
    "/:id",
    getCropById
);


// -----------------------------------------------------
// Update crop
// PUT /api/crops/:id
// -----------------------------------------------------

router.put(
    "/:id",
    updateCrop
);


// -----------------------------------------------------
// Delete crop
// DELETE /api/crops/:id
// -----------------------------------------------------

router.delete(
    "/:id",
    deleteCrop
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;