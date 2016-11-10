/**
 * Created by bvizy on 10/26/16.
 */
"use strict";
var Log = require("../lib/log");
/**
 * @swagger
 * /query:
 *   get:
 *     tags:
 *       - Query
 *     description: Queries the log db
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: source
 *         in: query
 *         description: Log source id
 *         required: true
 *         type: string
 *       - name: start_time
 *         in: query
 *         description: The start period to get logs from (ISO format)
 *         required: true
 *         type: string
 *       - name: end_time
 *         in: query
 *         description: The end period to get logs from (ISO format)
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         schema:
 *           title: ArrayOfLogs
 *           type: object
 *           properties:
 *             logs:
 *               type: array
 *               items:
 *                 title: Log
 *                 type: object
 *                 properties:
 *                   payload:
 *                     type: string
 *                   source:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                   transaction_id:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                   log_type:
 *                     type: string
 *                   id:
 *                     type: string
 *       4xx:
 *         description: Error message
 *         schema:
 *           title: Error
 *           type: object
 *           properties:
 *             info:
 *               type: string
 *             error:
 *               type: object
 */
function default_1(req, res) {
    var query = {
        source: req.query.source,
        timestamp: {}
    };
    if (req.query.end_time) {
        query.timestamp = { $gt: req.query.start_time, $lt: req.query.end_time };
    }
    else {
        query.timestamp = { $gt: req.query.start_time };
    }
    Log.find(query, null, { sort: { timestamp: -1 } }, function (err, logs) {
        if (err) {
            res.json({ info: "Error during finding logs", error: err });
        }
        else {
            if (logs) {
                res.json({ data: logs });
            }
            else {
                res.json({ info: "Logs not found" });
            }
        }
    });
    // For pagination later ...
    //  .skip(0)
    //  .limit(100)
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
;
//# sourceMappingURL=query.js.map