/**
 * Created by chrsdietz on 01/16/16.
 */
import { Request, Response } from "express";

import Log = require("../lib/log");
import Console from "../lib/console-utils";

export default function(req: Request, res: Response) {

    Console.log("Getting log summary.");
    const query = Object.assign({}, req.query);

    const sourceName = query.source;
    if (errorIfUndefined(sourceName, "Source name must be defined.", res)) {
        return;
    }

    // const startTime = query.start_time;
    // if (errorIfUndefined(startTime, "Start time must be defined.", res)) {
    //     return;
    // }

    // const endTime = query.end_time;
    // if (errorIfUndefined(endTime, "End time must be defined.", res)) {
    //     return;
    // }

    let opt = {
        sort: {timestamp: -1}
    };

    Console.log("Querying for summery");
    console.log(query);

    Log.find(query, null, opt)
    .then(function(logs) {
        createSummary(logs, res);
    })
    .catch(function(err: Error) {
        errorOut(err, res);
    });
}

function createSummary(logs: any, response: Response) {
    Console.info("Creating summary. " + logs.length);
    Console.log(logs);
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