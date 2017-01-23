/**
 * Created by chrsdietz on 01/16/16.
 */
import { Request, Response } from "express";

import { Document } from "mongoose";

import { getDateRange } from "./query-utils";

import Log from "../lib/log";
import Console from "../lib/console-utils";

export interface SourceStats {
    source: string;
    stats: {
        uniqueUsers: number;
        totalExceptions: number;
        totalEvents: number;
    };
}

/**
 * @swagger
 * /sourceStats:
 *   get:
 *     tags:
 *       - Query
 *     description: Queries the logs and returns the stats associated with a specified source.
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
 *         required: false
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
 *              -  title: source
 *                 type: string
 *              -  title: stats
 *                 type: object
 *                 properties:
 *                      uniqueUsers:
 *                          type: number
 *                      totalExceptions:
 *                          type: number
 *                      totatEvents:
 *                          type: number
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
export default function (req: Request, res: Response): Promise<SourceStats> {
    const reqQuer = Object.assign({}, req.query);

    const sourceId: string = reqQuer.source;
    if (!sourceId) {
        return new Promise(function (resolve, reject) {
            errorOut(new Error("Source ID must be provided."), res);
            resolve({
                source: "",
                stats: {
                    uniqueUsers: -1,
                    totalEvents: -1,
                    totalExceptions: -1
                }
            });
        });
    }

    const query: any = {
        "payload.context.user.userId": { $exists: true }
    };

    getDateRange(req, query);

    if (reqQuer.source) {
        Object.assign(query, { source: reqQuer.source });
    }

    Console.log("Querying for log unique users.");
    Console.log(query);

    const aggregation: any[] = [];

    // match only by request as those are the only ones with user IDs.
    aggregation.push({
        $match: query
    });

    // Group by the request type in the payload and count the number.
    aggregation.push({
        $group: {
            _id: "$payload.context.user.userId",
            count: { $sum: 1 }
        }
    });

    // Only push if there is a value "count_sort" in the request.
    if (reqQuer.count_sort) {
        if (reqQuer.count_sort === "asc") {
            aggregation.push({ $sort: { count: 1 } });
        } else if (reqQuer.count_sort === "desc") {
            aggregation.push({ $sort: { count: -1 } });
        }
    }

    let stats: SourceStats = {
        source: sourceId,
        stats: {
            uniqueUsers: 0,
            totalExceptions: 0,
            totalEvents: 0
        }
    };

    return Log.find(query)
        .then(function (res: Document[]) {
            stats.stats.totalEvents = res.length;
            return Log.distinct("payload.context.user.userId", query);
        }).then(function (res: Document[]) {
            stats.stats.uniqueUsers = res.length;
            return stats;
        }).then(function (value: SourceStats) {
            sendResult(res, value);
            return value;
        })
        .catch(function (err: Error) {
            errorOut(err, res);
            return { count: [] };
        });
}

function sendResult(response: Response, result: SourceStats) {
    response.status(200).json(result);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting source stats: " + error.message);
    response.status(400).send(error.message);
}