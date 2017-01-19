/**
 * Created by chrsdietz on 01/16/16.
 */
import { Request, Response } from "express";

import { getDateRange } from "./query-utils";

import Log, { ILog } from "../lib/log";
import { getTimeSummary, TimeSummary } from "../lib/time-bucket";
import Console from "../lib/console-utils";

export interface TimeBucket {
    timestamp: Date;
    count: number;
}

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

    const query: any = {};

    getDateRange(req, query);

    if (reqQuer.source) {
        Object.assign(query, { source: reqQuer.source });
    }

    let opt = undefined;
    if (reqQuer.date_sort) {
        let sort = undefined;
        if (reqQuer.date_sort === "asc") {
            sort = 1;
        } else if (reqQuer.date_sort === "desc") {
            sort = -1;
        }

        if (sort) {
            opt = {
                sort: { timestamp: sort }
            };
        }
    }

    Console.log("Querying for time summary");
    Console.log(query);

    return Log.find(query, undefined, opt)
        .then(function (logs: any[]) {
            return createSummary(logs, res);
        })
        .catch(function (err: Error) {
            errorOut(err, res);
            return { buckets: [] };
        });
}

function createSummary(logs: ILog[], response: Response): TimeSummary {
    Console.info("Creating summary. " + logs.length);
    const timeSummary: TimeSummary = getTimeSummary(logs);
    response.status(200).json(timeSummary);
    return timeSummary;
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting logs summary: " + error.message);
    response.status(400).send(error.message);
}