/**
 * Created by chrsdietz on 01/16/16.
 */
import { DocumentQuery } from "mongoose";
import { Request, Response } from "express";

import Log, { ILog } from "../lib/log";
import Console from "../lib/console-utils";

export interface TimeBucket {
    timestamp: Date;
    count: number;
}

export default function (req: Request, res: Response) {

    Console.log("Getting log summary.");
    const remoteQuery = Object.assign({}, req.query);

    const sourceName = remoteQuery.source;
    if (errorIfUndefined(sourceName, "Source name must be defined.", res)) {
        return;
    }

    const startTime = remoteQuery.start_time;
    if (errorIfUndefined(startTime, "Start time must be defined.", res)) {
        return;
    }

    const endTime = remoteQuery.end_time;
    if (errorIfUndefined(endTime, "End time must be defined.", res)) {
        return;
    }

    const query: any = {
        source: remoteQuery.source
    };

    // Object.assign(query, { timestamp: { $gt: req.query.start_time }});
    // Object.assign(query.timestamp, { $lt: req.query.end_time });

    let opt = {
        sort: { timestamp: -1 }
    };

    Console.log("Querying for summery");
    console.log(query);

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
    response.status(200).json(logs);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting logs summary: " + error.message);
    response.status(400).send(error.message);
}

function errorIfUndefined(object: any, msg: string, response: Response): boolean {
    if (!object) {
        Console.info("Error getting logs summary: " + msg);
        response.status(400).send(msg);
        return true;
    }
    return false;
}