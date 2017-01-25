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

    const recordsAgg: any[] = aggregation.slice();
    const errorsAgg: any[] = aggregation.slice();
    const usersAgg: any[] = aggregation.slice();

    recordsAgg.push(
        {
            $group: { _id: "$transaction_id" }
        }
    );

    errorsAgg.push(
        {
            $match: { log_type: "ERROR" },
        }
    );

    usersAgg.push(
        {
            $group: {
                _id: null,
                ID: {
                    $addToSet: {
                        foo_id: "$payload.session.user.userId",
                        bar_id: "$payload.context.System.user.userId"
                    }
                }
            }
        },
        {
            $project: {
                ID: {
                    $setUnion: ["$ID.foo_id", "$ID.bar_id"]
                },
                _id: 0
            }
        },
        {
            $unwind: "$ID"
        },
        {
            $match: {
                ID: { $ne: undefined }
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
        }
    };

    return Log.aggregate(recordsAgg)
    .then(function(val: any[]) {
        Object.assign(result, { totalEvents: val.length });
        return Log.aggregate(errorsAgg);
    }).then(function(val: any[]) {
        Object.assign(result, { totalExceptions: val.length });
        return Log.aggregate(usersAgg);
    }).then(function(val: any[]) {
        Object.assign(result, { totalUsers: val.length });
        return result;
    }).then(function(result: any) {
        stats.stats.totalEvents = result.totalEvents;
        stats.stats.totalExceptions = result.totalExceptions;
        stats.stats.totalUsers = result.totalUsers;
        sendResult(res, stats);
        return stats;
    }).catch(function(err: Error) {
        errorOut(err, res);
        return stats;
    });

/**************************** MongoDB 3.4 compatible query. Use if and when remote server gets updated. ***********************/
    // Using facet aggregation to put all the stats together by one.
    // 3.4 does not allow $facet. This would be a faster query when the remote server gets updated.
    // aggregation.push({
    //     $facet: {
    //         records: [
    //             {
    //                 $group: { _id: "$transaction_id" }
    //             },
    //             {
    //                 $count: "totalEvents"
    //             }
    //         ],
    //         errors: [
    //             {
    //                 $match: { log_type: "ERROR" },
    //             },
    //             {
    //                 $count: "totalExceptions"
    //             }
    //         ],
    //         sessionUsers: [
    //             {
    //                 $group: {
    //                     _id: null,
    //                     ID: {
    //                         $addToSet: {
    //                             foo_id: "$payload.session.user.userId",
    //                             bar_id: "$payload.context.System.user.userId"
    //                         }
    //                     }
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     ID: {
    //                         $setUnion: ["$ID.foo_id", "$ID.bar_id"]
    //                     },
    //                     _id: 0
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     ID: {
    //                         $filter: { input: "$ID", as: "id", cond: { $ne: [{ $type: "$$id" }, "undefined"] } }
    //                     }
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     _id: 0,
    //                     totalUsers: { $size: "$ID" }
    //                 }
    //             }
    //         ]
    //     }
    // });

    // return Log.aggregate(aggregation)
    //     .then(function (val: any[]): SourceStats {
    //         const record: any = val[0];
    //         const stats: SourceStats = processRecord(sourceId, record);
    //         sendResult(res, stats);
    //         return stats;
    //     }).catch(function (err: Error) {
    //         errorOut(err, res);
    //         return {
    //             source: "",
    //             stats: undefined
    //         };
    //     });
}

/************** MongoDB 3.4 compatible code. ***************/
// function processRecord(sourceId: string, record: any): SourceStats {
//     if (record) {
//         return {
//             source: sourceId,
//             stats: {
//                 totalUsers: (record.sessionUsers[0]) ? record.sessionUsers[0].totalUsers : 0,
//                 totalEvents: (record.records[0]) ? record.records[0].totalEvents : 0,
//                 totalExceptions: (record.records[0]) ? record.errors[0].totalExceptions : 0
//             }
//         };
//     } else {
//         return {
//             source: sourceId,
//             stats: {
//                 totalUsers: 0,
//                 totalEvents: 0,
//                 totalExceptions: 0
//             }
//         };
//     }
// }
/************* MongoDB 3.4 compatible code. ********************/

function sendResult(response: Response, result: any) {
    response.status(200).json(result);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting source stats: " + error.message);
    response.status(400).send(error.message);
}