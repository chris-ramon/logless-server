/**
 * Created by chrsdietz on 01/16/16.
 */
import { Request, Response } from "express";

import { getDateRange } from "./query-utils";

import Log from "../lib/log";
import { TimeBucket, TimeSummary } from "../lib/time-bucket";
import Console from "../lib/console-utils";

/**
 * @swagger
 * /timeSummary:
 *   get:
 *     tags:
 *       - Query
 *     description: Queries the log and returns a count summary of each log in specified time buckets
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
 *       - name: date_sort
 *         in: query
 *         description: The order in which the date buckets should be sorted. Can be "asc" or "desc".
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         schema:
 *           title: ArrayOfTimeeBuckets
 *           type: object
 *           properties:
 *             buckets:
 *               type: array
 *               items:
 *                 title: TimeSummary
 *                 type: object
 *                 properties:
 *                   date:
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
export default function (req: Request, res: Response): Promise<TimeSummary> {
    const reqQuer = Object.assign({}, req.query);

    const query = {};

    getDateRange(req, query);

    if (reqQuer.source) {
        Object.assign(query, { source: reqQuer.source });
    }

    let aggregation = [];

    aggregation.push({
        $match: query
    });

    aggregation.push({
        $group: {
            _id: {
                month: { $month: "$timestamp" },
                day: { $dayOfMonth: "$timestamp" },
                year: { $year: "$timestamp" }
            },
            count: {
                $sum: 1
            }
        }
    });

    if (reqQuer.date_sort) {
        if (reqQuer.date_sort === "asc") {
            aggregation.push({
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1,
                    "_id.day": 1
                }
            });
        } else if (reqQuer.date_sort === "desc") {
            aggregation.push({
                $sort: {
                    "_id.year": -1,
                    "_id.month": -1,
                    "_id.day": -1
                }
            });
        }
    }

    return Log.aggregate(aggregation)
        .then(function (results: any[]): TimeBucket[] {
            return results.map(function (value: any, index: number, array: any[]): TimeBucket {
                const timeBucket: TimeBucket = {
                    date: new Date(value._id.year, value._id.month, value._id.day, 0, 0, 0, 0),
                    count: value.count
                };
                return timeBucket;
            });
        }).then(function (buckets: TimeBucket[]): TimeSummary {
            const timeSummary: TimeSummary = {
                buckets: buckets
            };
            sendOut(timeSummary, res);
            return timeSummary;
        }).catch(function (err: Error) {
            errorOut(err, res);
            return { bucket: [] };
        });
}

function sendOut(summary: TimeSummary, response: Response) {
    response.status(200).json(summary);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting logs summary: " + error.message);
    response.status(400).send(error.message);
}