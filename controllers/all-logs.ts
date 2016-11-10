/**
 * Created by bvizy on 10/26/16.
 */

/* Read all */
import Log = require("../lib/log");

export default function (req, res) {
    Log.find({}, null, {sort: {timestamp: -1}}, (err, logs) => {
        if (err) {
            res.json({info: "Error during finding logs", error: err});
        } else {
            res.json({data: logs});
        }
    });
};
