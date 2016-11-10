/**
 * Created by bvizy on 10/26/16.
 */
"use strict";
/* Read all */
var Log = require("../lib/log");
function default_1(req, res) {
    Log.find({}, null, { sort: { timestamp: -1 } }, function (err, logs) {
        if (err) {
            res.json({ info: "Error during finding logs", error: err });
        }
        else {
            res.json({ data: logs });
        }
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
;
//# sourceMappingURL=all-logs.js.map