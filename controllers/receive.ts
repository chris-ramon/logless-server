/**
 * Created by bvizy on 10/26/16.
 */

import Log = require("../lib/log");
import async = require("async");

/**
 * @swagger
 * /receive:
 *   post:
 *     tags:
 *       - Receive
 *     description: Creates new log entries
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: logs
 *         description: Log list
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/Logs'
 *     responses:
 *       200:
 *         description: Successfully created
 *         schema:
 *           $ref: "#/definitions/Info"
 *       400:
 *         description: Error message
 *         schema:
 *           $ref: "#/definitions/Error"
 */

export default function (req, res) {
    let batch = req.body;
    let logs: any[] = [];

    for (let log of batch.logs) {
        log["source"] = batch.source;
        log["transaction_id"] = batch.transaction_id;
        logs.push(log);
    }

    async.mapLimit(logs, 100, function(l1, callback) {
        let newLog = new Log(l1);
        newLog.save((err) => {
            if (err)
                return callback(err, l1);

            callback(null, l1);
        });
    }, function(err, results) {
        if (err) {
            console.error({info: "Error during log entry create", error: err});
        }
        // else {
        //     console.log({info: results.length + " inserted"});
        // }
    });

    res.json({logs: logs.length});
};

