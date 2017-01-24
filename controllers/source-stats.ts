/**
 * Created by chrsdietz on 01/16/16.
 */
import { Request, Response } from "express";

import { getDateRange } from "./query-utils";

import Log from "../lib/log";
import Console from "../lib/console-utils";

export interface SourceStats {
    source: string;
    stats: {
        totalUsers: number;
        totalExceptions: number;
        totalEvents: number;
    };
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

    // Using facet aggregation to put all the stats together by one.
    aggregation.push({
        $facet: {
            records: [
                {
                    $group: { _id: "$transaction_id" }
                },
                {
                    $count: "totalEvents"
                }
            ],
            errors: [
                {
                    $match: { log_type: "ERROR" },
                },
                {
                    $count: "totalExceptions"
                }
            ],
            sessionUsers: [
                {
                    // Collect all user IDs in array.
                    $project:
                    {
                        _id: 0,
                        IDS: ["$payload.session.user.userId", "$payload.context.System.user.userId"]
                    }
                }, {
                    // Unwind the array in to individual objects
                    $unwind: "$IDS"
                },
                {
                    // Remove all nulls
                    $match: {
                        IDS: { $ne: null }
                    }
                },
                {
                    // Group them together
                    $group: {
                        _id: 1,
                        distinctIds: {
                            $addToSet: "$IDS"
                        }
                    }
                },
                {
                    // Return the size of the remaining array.
                    $project: {
                        _id: 0,
                        totalUsers: { $size: "$distinctIds" }
                    }
                }
            ]
        }
    });

    return Log.aggregate(aggregation)
        .then(function (val: any[]): SourceStats {
            const record: any = val[0];
            const stats: SourceStats = processRecord(sourceId, record);
            sendResult(res, stats);
            return stats;
        }).catch(function (err: Error) {
            errorOut(err, res);
            return {
                source: "",
                stats: undefined
            };
        });
}

function processRecord(sourceId: string, record: any): SourceStats {
    if (record) {
        return {
            source: sourceId,
            stats: {
                totalUsers: (record.sessionUsers[0]) ? record.sessionUsers[0].totalUsers : 0,
                totalEvents: (record.records[0]) ? record.records[0].totalEvents : 0,
                totalExceptions: (record.records[0]) ? record.errors[0].totalExceptions : 0
            }
        };
    } else {
        return {
            source: sourceId,
            stats: {
                totalUsers: 0,
                totalEvents: 0,
                totalExceptions: 0
            }
        };
    }
}

function sendResult(response: Response, result: any) {
    response.status(200).json(result);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting source stats: " + error.message);
    response.status(400).send(error.message);
}