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
    Unknown?: TotalStat;
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

    // Records is the number of "conversations" found.  I.E.  Of all transactions.
    recordsAgg.push(
        {
            // Project only the items we need.
            $project: {
                "transaction_id": 1,
                "payload.request.type": 1,
                "payload.result.action": 1
            },
        }, {
            // Match only the logs that we can use.
            $match: {
                "transaction_id": { $exists: true },
                $or: [{
                    "payload.request.type": { $exists: true }
                }, {
                    "payload.result.action": { $exists: true }
                }]
            },
        }, {
            // Group by transaction ID and collect origin.
            $group: {
                _id: "$transaction_id",
                origin: {
                    $addToSet: {
                        $cond: {
                            if: { $ne: [{ $ifNull: ["$payload.request.type", "missing"] }, "missing"] },
                            then: Constants.AMAZON_ALEXA,
                            else: {
                                $cond: {
                                    if: { $ne: [{ $ifNull: ["$payload.result.action", "missing"] }, "missing"] },
                                    then: Constants.GOOGLE_HOME,
                                    else: Constants.UNKNOWN
                                }
                            }
                        }
                    }
                }
            }
        }, {
            // Unwind origin.
            $unwind: "$origin",
        }, {
            // Count the origin occurances.
            $group: {
                _id: "$origin",
                count: { $sum: 1 }
            }
        }
    );

    // Errors is supposed to find the number of ERROR logs that are occurred.
    errorsAgg.push(
        {
            // Keep in memory only what we need.
            $project: {
                "log_type": 1,
                "transaction_id": 1,
                "payload.request.type": 1,
                "payload.result.action": 1
            },
        }, {
            // Group by transaction ID so all log types related will be covered.  This will capture log types that don't have a payload,
            // and group them to their request-response logs.  It will push the type to a stack to not lose information.
            $group: {
                _id: "$transaction_id",
                origin: {
                    $addToSet: {
                        $cond: {
                            if: { $ne: [{ $ifNull: ["$payload.request.type", "missing"] }, "missing"] },
                            then: Constants.AMAZON_ALEXA,
                            else: {
                                $cond: {
                                    if: { $ne: [{ $ifNull: ["$payload.result.action", "missing"] }, "missing"] },
                                    then: Constants.GOOGLE_HOME,
                                    else: Constants.UNKNOWN
                                }
                            }
                        }
                    }
                },
                types: {
                    $push: {
                        log_type: "$log_type"
                    }
                }
            }
        }, {
            // Project only the types that are of ERROR.  Also, only collect origins that we know.
            // At this stage, the origin will either be ["unknown"] or ["valid_origin", "unkonwn"].  So, remove all multi-value arrays with "unknown".
            $project: {
                origin: {
                    $filter: {
                        input: "$origin",
                        as: "o",
                        cond: { $ne: [ "$$o", Constants.UNKNOWN ] }
                    }
                },
                types: {
                    $filter: {
                        input: "$types",
                        as: "type",
                        cond: { $eq: ["$$type.log_type", "ERROR"] }
                    }
                }
            },
        }, {
            // Clear out any empty logs (They didn't have ERROR)
            $match: {
                types: {
                    $ne: []
                }
            }
        }, {
            // Unwinding all types to group them.  Since we filtered out "unknown", all empty arrays will be "unknown".
            $unwind: {
                path: "$origin",
                preserveNullAndEmptyArrays: true
            }
        }, {
            // Regroup and count.
            $group: {
                _id: "$origin",
                count: { $sum: 1 }
            }
        }
    );

    // Users is to find the number of unique users that occur on each device.
    // "$payload.session.user.userId" Amazon
    // "$payload.context.System.user.userId" Amazon
    // "$payload.originalRequest.data.user.user_id" Google Home (API.AI)
    usersAgg.push(
        {
            // Match only the items we need.
            $project: {
                "payload.session.user.userId": 1,
                "payload.context.System.user.userId": 1,
                "payload.originalRequest.data.user.user_id": 1,
            }
        }, {
            // Filter only the logs that have users. Can't decipher the ones that don't.
            $match: {
                $or: [{
                    "payload.session.user.userId": { $exists: true }
                }, {
                    "payload.context.System.user.userId": { $exists: true }
                }, {
                    "payload.originalRequest.data.user.user_id": { $exists: true }
                }]
            }
        }, {
            // Group all the logs with the same user ID.  Caputer the origin.
            $group: {
                _id: {
                    $ifNull: ["$payload.session.user.userId",
                        { $ifNull: ["$payload.context.System.user.userId", "$payload.originalRequest.data.user.user_id"] }]
                },
                origin: {
                    $addToSet: {
                        $cond: {
                            if: { $ne: [{ $ifNull: ["$payload.context.System.user.userId", "missing"] }, "missing"] },
                            then: Constants.AMAZON_ALEXA,
                            else: {
                                $cond: {
                                    if: { $ne: [{ $ifNull: ["$payload.originalRequest.data.user.user_id", "missing"] }, "missing"] },
                                    then: Constants.GOOGLE_HOME,
                                    else: Constants.UNKNOWN
                                }
                            }
                        }
                    }
                }
            }
        }, {
            // Remove undefined users.
            $match: {
                _id: { $ne: undefined }
            }
        }, {
            // Split out the origin array.
            $unwind: "$origin",
        }, {
            // Regroup and count.
            $group: {
                _id: "$origin",
                count: { $sum: 1 }
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
        },
        Unknown: {
            totalUsers: 0,
            totalExceptions: 0,
            totalEvents: 0
        }
    };

    return Log.aggregate(recordsAgg)
        .then(function (val: any[]) {
            retrieveTotals(stats, "totalEvents", val);
            return Log.aggregate(errorsAgg);
        }).then(function (val: any[]) {
            console.log(val);
            retrieveTotals(stats, "totalExceptions", val);
            return Log.aggregate(usersAgg);
        }).then(function (val: any[]) {
            retrieveTotals(stats, "totalUsers", val);
            return result;
        }).then(function (result: any) {
            sendResult(res, stats);
            return stats;
        }).catch(function (err: Error) {
            errorOut(err, res);
            return stats;
        });
}

function retrieveTotals(stats: SourceStats, statValue: string, val: any[]): any {
    stats.stats[statValue] = 0;
    for (let i = 0; i < val.length; ++i) {
        const value = val[i];
        const id = (value._id) ? value._id : Constants.UNKNOWN;
        stats[id][statValue] = value.count;
        stats.stats[statValue] += value.count;
    }
    console.log(stats);
    return stats;
}

function sendResult(response: Response, result: any) {
    response.status(200).json(result);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting source stats: " + error.message);
    response.status(400).send(error.message);
}