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

export default function (req: Request, res: Response) {
    const reqQuer = Object.assign({}, req.query);

    const query: any = {};

    getDateRange(req, query);

    if (reqQuer.source) {
        Object.assign(query, { source: reqQuer.source });
    }

    let opt = {
        sort: { timestamp: -1 }
    };

    Console.log("Querying for time summary");
    Console.log(query);

    Log.find(query, null, opt)
        .then(function (logs: any[]) {
            createSummary(logs, res);
        })
        .catch(function (err: Error) {
            errorOut(err, res);
        });
}

function createSummary(logs: ILog[], response: Response) {
    Console.info("Creating summary. " + logs.length);
    const timeSummary: TimeSummary = getTimeSummary(logs);
    response.status(200).json(timeSummary);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting logs summary: " + error.message);
    response.status(400).send(error.message);
}