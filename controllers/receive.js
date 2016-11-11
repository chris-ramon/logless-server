/**
 * Created by bvizy on 10/26/16.
 */
"use strict";
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
function default_1(req, res) {
    var batch = req.body;
    var logs = [];
    for (var _i = 0, _a = batch.logs; _i < _a.length; _i++) {
        var log = _a[_i];
        log["source"] = batch.source;
        log["transaction_id"] = batch.transaction_id;
        logs.push(log);
    }
    // async.mapLimit(logs, 10, function(l1, callback) {
    //     if (ServerConfig.debug_mode) {
    //         console.log(l1);
    //     }
    //
    //     let newLog = new Log(l1);
    //     newLog.save((err) => {
    //         if (err)
    //             return callback(err, l1);
    //
    //         callback(null, l1);
    //     });
    // }, function(err, results) {
    //     if (err) {
    //         console.error({info: "Error during log entry create", source: batch.source, tx: batch.transaction_id, error: err});
    //     }
    //     else {
    //         if (ServerConfig.debug_mode) {
    //             console.log({info: results.length + " logs inserted", source: batch.source, tx: batch.transaction_id});
    //         }
    //      }
    // });
    res.json({ logs: logs.length });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
;
//# sourceMappingURL=receive.js.map