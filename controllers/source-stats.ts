/**
 * Created by chrsdietz on 01/16/16.
 */
import { Request, Response } from "express";

import { getDateRange } from "./query-utils";

import Log from "../lib/log";
import Console from "../lib/console-utils";
import Constants from "../lib/constants";

export interface TotalStat {
    totalUsers: number;
    totalExceptions: number;
    totalEvents: number;
}

export interface SourceStats {
    source: string;
    stats: TotalStat;
    "Amazon.Alexa"?: TotalStat;
    "Google.Home"?: TotalStat;
}

/**
 * @swagger
 * /sourcestats:
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
 *                      totalUsers:
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

    const query: any = {};

    Object.assign(query, { source: sourceId });

    getDateRange(req, query);

    Console.log("Querying for source stats.");
    Console.log(query);

    const aggregation: any[] = [];

    // match only by request as those are the only ones with request types.
    aggregation.push({
        $match: query
    });

    const recordsAgg: any[] = aggregation.slice();
    const errorsAgg: any[] = aggregation.slice();
    const usersAgg: any[] = aggregation.slice();

    recordsAgg.push(
        {
            $match: {
                "transaction_id": { $exists: true }
            },
        },
        {
            $project: {
                "transaction_id": 1,
                "payload.request.type": 1,
                "payload.result.action": 1
            },
        }, {
            $group: {
                _id: "$transaction_id",
                origin: {
                    $addToSet: {
                        $cond: {
                            if: { $ne: [{ $ifNull: ["$payload.request.type", "missing"] }, "missing"] },
                            then: Constants.AMAZON_ALEXA,
                            else: Constants.GOOGLE_HOME
                        }
                    }
                }
            }
        }, {
            $unwind: "$origin",
        }, {
            $group: {
                _id: "$origin",
                count: { $sum: 1 }
            }
        }
    );

    errorsAgg.push(
        {
            $match: { log_type: "ERROR" },
        }
    );

    // "$payload.session.user.userId" Amazon
    // "$payload.context.System.user.userId" Amazon
    // "$payload.originalRequest.data.user.user_id" Google Home (API.AI)
    usersAgg.push(
        {
            $match: {
                $or: [{
                    "payload.session.user.userId": { $exists: true }
                }, {
                    "payload.context.System.user.userId": { $exists: true }
                }, {
                    "payload.originalRequest.data.user.user_id": { $exists: true }
                }]
            }
        },
        {
            $group: {
                _id: {
                    $ifNull: ["$payload.session.user.userId",
                        { $ifNull: ["$payload.context.System.user.userId", "$payload.originalRequest.data.user.user_id"] }]
                }
            }
        }, {
            $match: {
                _id: { $ne: undefined }
            }
        }
    );

    let result: any = {};

    let stats: SourceStats = {
        source: sourceId,
        stats: {
            totalUsers: 0,
            totalExceptions: 0,
            totalEvents: 0
        },
        "Amazon.Alexa": {
            totalUsers: 0,
            totalExceptions: 0,
            totalEvents: 0
        },
        "Google.Home": {
            totalUsers: 0,
            totalExceptions: 0,
            totalEvents: 0
        }
    };

    return Log.aggregate(recordsAgg)
        .then(function (val: any[]) {
            console.log(val);
            const totalEvents = retrieveEvents(val);
            console.log(totalEvents);
            Object.assign(stats, totalEvents);
            return Log.aggregate(errorsAgg);
        }).then(function (val: any[]) {
            // console.log(val);
            Object.assign(result, { totalExceptions: val.length });
            return Log.aggregate(usersAgg);
        }).then(function (val: any[]) {
            // console.log(val);
            Object.assign(result, { totalUsers: val.length });
            return result;
        }).then(function (result: any) {
            // stats.stats.totalEvents = result.totalEvents;
            // stats.stats.totalExceptions = result.totalExceptions;
            // stats.stats.totalUsers = result.totalUsers;
            sendResult(res, stats);
            return stats;
        }).catch(function (err: Error) {
            errorOut(err, res);
            return stats;
        });
}

function retrieveEvents(val: any[]): any {
    let totals: any = { stats: { totalEvents: 0 }};
    for (let i = 0; i < val.length; ++i) {
        const value = val[i];
        totals[value._id] = { totalEvents: value.count };
        totals["stats"].totalEvents += value.count;
    }
    return totals;
}

function sendResult(response: Response, result: any) {
    response.status(200).json(result);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting source stats: " + error.message);
    response.status(400).send(error.message);
}