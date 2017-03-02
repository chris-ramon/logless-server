/**
 * Created by chrsdietz on 01/16/16.
 */
import { Request, Response } from "express";

import { getDateRange } from "./query-utils";

import Log from "../lib/log";
import Console from "../lib/console-utils";

import { Count, CountResult } from "../lib/counter";

/**
 * @swagger
 * /intentSummary:
 *   get:
 *     tags:
 *       - Query
 *     description: Queries the log and returns a count summary of each log intent
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: source
 *         in: query
 *         description: Log source id
 *         required: false
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
 *       - name: count_sort
 *         in: query
 *         description: The order in which the count buckets should be sorted. Can be "asc" or "desc".
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         schema:
 *           title: ArrayOfTimeeBuckets
 *           type: object
 *           properties:
 *             count:
 *               type: array
 *               items:
 *                 title: CountResult
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   count:
 *                     type: number
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
export default function (req: Request, res: Response): Promise<CountResult> {
    const reqQuer = Object.assign({}, req.query) as ReqQuer;

    const query: any = {
        $or: [{
            "payload.request": { $exists: true } // Amazon Alexa
        }, {
            "payload.result": { $exists: true } // Google Home
        }]
    };

    getDateRange(req, query);

    if (reqQuer.source) {
        Object.assign(query, { source: reqQuer.source });
    }

    Console.log("Querying for intent count summary");
    Console.log(query);

    const aggregation: any[] = [];

    // match only by request as those are the only ones with request types.
    aggregation.push({
        $match: query
    });

    aggregation.push({
        $group: {
            _id: {
                $switch: {
                    branches: [{
                        case: { $eq: ["$payload.request.type", "IntentRequest"] }, // Alexa custom actions.
                        then: "$payload.request.intent.name"
                    }, {
                        case: { $ne: [{ $type: "$payload.request.type" }, "missing"] }, // Alexa actions.
                        then: "$payload.request.type"
                    }, {
                        case: { $ne: [{ $type: "$payload.result.action" }, "missing"] }, // Google actions.
                        then: "$payload.result.action"
                    }],
                    default: "remaining" // Something we don't know yet.
                }
            },
            origin: { $addToSet: { $ifNull: [ "$payload.result.action", "$payload.request.type" ] } },
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

    return Log.aggregate(aggregation)
        .then(function (aggregation: any[]): Count[] {
            return aggregation.map(function (value: any, index: number, array: any[]): Count {
                const count: Count = {
                    name: (value.origin[0] === "IntentRequest") ? value.origin[0] + "." + value._id : value._id,
                    count: value.count
                };
                return count;
            });
        })
        .then(function (counts: Count[]): CountResult {
            const result: CountResult = {
                count: counts
            };

            sendResult(res, result);
            return result;
        }).catch(function (err: Error) {
            errorOut(err, res);
            return { count: [] };
        });
}

function sendResult(response: Response, result: CountResult) {
    response.status(200).json(result);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting logs summary: " + error.message);
    response.status(400).send(error.message);
}

interface ReqQuer {
    source: string;
    count_sort: "asc" | "desc";
}