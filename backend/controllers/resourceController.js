const db = require("../db");


/*
=========================================================
SEARCH RESOURCES (curated, real, verified resources)

GET /api/resources/search?specialization=Rice
GET /api/resources/search?topRated=true

Returns real resources from our own curated database,
matched to the expert's specialization where possible.
Google's Custom Search API was evaluated but is now
closed to new customers, so this curated approach is
used instead - see project notes for details.
=========================================================
*/

function mapRow(row) {

    return {

        title: row.title,

        link: row.link,

        snippet: row.snippet,

        displayLink: row.display_link,

        thumbnail: null

    };

}


// Crops that are close enough to be shown together, since an
// expert specializing in one very likely cares about the other.
const RELATED_SPECIALIZATIONS = {

    "rice": ["rice", "paddy field"],

    "paddy field": ["paddy field", "rice"]

};


const searchResources = (req, res) => {

    const {
        specialization,
        topRated
    } = req.query;


    if (topRated === "true") {

        const sql = `
            SELECT title, link, snippet, display_link
            FROM resources
            WHERE is_top_rated = 1
            ORDER BY created_at DESC
        `;

        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.error(
                        "Search resources error:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Failed to load resources."
                    });

                }

                return res.status(200).json({
                    success: true,
                    resources: results.map(mapRow)
                });

            }
        );

        return;

    }


    if (specialization) {

        const normalized =
            String(specialization).toLowerCase().trim();

        const matchTerms =
            RELATED_SPECIALIZATIONS[normalized] || [normalized];

        const placeholders =
            matchTerms.map(() => "LOWER(specialization) = ?").join(" OR ");

        const sql = `
            SELECT title, link, snippet, display_link
            FROM resources
            WHERE ${placeholders}
            ORDER BY created_at DESC
        `;

        db.query(
            sql,
            matchTerms,
            (err, results) => {

                if (err) {

                    console.error(
                        "Search resources error:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Failed to load resources."
                    });

                }

                // No curated resources yet for this specific
                // specialization - fall back to the top-rated
                // pool instead of showing nothing.
                if (results.length === 0) {

                    db.query(
                        `SELECT title, link, snippet, display_link
                         FROM resources
                         WHERE is_top_rated = 1
                         ORDER BY created_at DESC`,
                        (fallbackErr, fallbackResults) => {

                            if (fallbackErr) {

                                console.error(
                                    "Search resources fallback error:",
                                    fallbackErr
                                );

                                return res.status(500).json({
                                    success: false,
                                    message: "Failed to load resources."
                                });

                            }

                            return res.status(200).json({
                                success: true,
                                resources: fallbackResults.map(mapRow)
                            });

                        }
                    );

                    return;

                }

                return res.status(200).json({
                    success: true,
                    resources: results.map(mapRow)
                });

            }
        );

        return;

    }


    // No specialization and not asking for top rated -
    // just return everything we have.
    const sql = `
        SELECT title, link, snippet, display_link
        FROM resources
        ORDER BY created_at DESC
    `;

    db.query(
        sql,
        (err, results) => {

            if (err) {

                console.error(
                    "Search resources error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to load resources."
                });

            }

            return res.status(200).json({
                success: true,
                resources: results.map(mapRow)
            });

        }
    );

};


module.exports = {
    searchResources
};
