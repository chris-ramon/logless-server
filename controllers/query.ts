/**
 * Created by bvizy on 10/26/16.
 */

import Log from "../lib/log";
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
 *       - name: transaction_id
 *         in: query
 *         description: Transaction id
 *         required: false
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
        Object.assign(query.timestamp, { $lt: req.query.end_time });
    } else {
        Object.assign(query.timestamp, { $lt: new Date() });
    }

    if (req.query.logtype) {
        Object.assign(query, { log_type: req.query.logtype });
    }

    if (req.query.start_time) {
        Object.assign(query.timestamp, { $gt: req.query.start_time });
    } // no default

    if (req.query.transaction_id) {
        Object.assign(query, { transaction_id: req.query.transaction_id })
    }

    if (ServerConfig.debug_mode) {
        console.time("query-" + req.query.source);
    }

    let opt = {
        sort: {timestamp: -1}
    };

    if (req.query.limit) {
        let limit = parseInt(req.query.limit);
        Object.assign(opt, {limit: limit});
    }

    console.log(req.query);
    console.log(query);

    Log.find(query, null, opt, (err, logs) => {
        if (err) {
            res.json({info: "Error during finding logs", error: err});
        } else {
            if (logs) {
                if (ServerConfig.debug_mode) {
                    console.timeEnd("query-" + req.query.source);
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

