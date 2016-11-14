/**
 * Created by bvizy on 10/26/16.
 */

import Log = require("../lib/log");
import {ServerConfig} from "../lib/server-config";

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

export default function (req, res) {
    let query = {
        source: req.query.source,
        timestamp: {}
    };

    if (req.query.end_time) {
        query.timestamp = {$gt: req.query.start_time, $lt: req.query.end_time};
    } else {
        query.timestamp = {$gt: req.query.start_time};
    }

    if (ServerConfig.debug_mode) {
        console.time("query-" + req.query.source)
    }

    Log.find(query, null, {sort: {timestamp: -1}}, (err, logs) => {
        if (err) {
            res.json({info: "Error during finding logs", error: err});
        } else {
            if (logs) {
                if (ServerConfig.debug_mode) {
                    console.timeEnd("query-" + req.query.source)
                    console.log(JSON.stringify({info: logs.length + " logs queried", source: req.query.source}));
                }

                res.json({data: logs});
            } else {
                res.json({info: "Logs not found"});
            }
        }
    });

    // For pagination later ...
    //  .skip(0)
    //  .limit(100)
};

