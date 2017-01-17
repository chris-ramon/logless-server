/**
 * Created by chrsdietz on 01/16/16.
 */
import { Request, Response } from "express";

import Log, { ILog } from "../lib/log";
import { getTimeSummary, TimeSummary } from "../lib/time-bucket";
import Console from "../lib/console-utils";

export default function (req: Request, res: Response) {
    const reqQuer = Object.assign({}, req.query);

    const query: any = {};

    let timestamp: any = undefined;

    if (reqQuer.start_time) {
        timestamp = {};
        Object.assign(timestamp, { $gt: reqQuer.start_time });
    }

    if (reqQuer.end_time) {
        timestamp = (timestamp) ? timestamp : {};
        Object.assign(timestamp, { $lt: reqQuer.end_time });
    }

    if (timestamp) {
        Object.assign(query, { timestamp: timestamp });
    }

    if (reqQuer.source) {
        Object.assign(query, { source: reqQuer.source });
    }

    let opt = {
        sort: { timestamp: -1 }
    };
}