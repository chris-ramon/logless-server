/**
 * Created by chrsdietz on 01/16/16.
 */
import { Request, Response } from "express";

import { getDateRange } from "./query-utils";

import Log, { ILog } from "../lib/log";
import Console from "../lib/console-utils";

import { counter, Count, CountResult } from "../lib/counter";

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

    Console.log("Querying for intent count summery");
    Console.log(query);

    Log.find(query, null, opt)
        .then(function (logs: any[]) {
            return createSummary(logs);
        }).then(function(result: CountResult) {
            return sort(result);
        })
        .then(function(result: CountResult) {
            sendResult(res, result);
        })
        .catch(function (err: Error) {
            errorOut(err, res);
        });
}

function createSummary(logs: ILog[]): CountResult {
    Console.info("Creating intent count summary. " + logs.length);
    return counter({
        length() {
            return logs.length;
        },
        name(index: number) {
            const payload = logs[index].payload;
            const payloadObj: any = parseJson(payload);
            if (payloadObj) {
                if (payloadObj.request) {
                    return payloadObj.request.type;
                }
            }
        }
    });
}

function sort(result: CountResult): CountResult {
    result.count.sort(function(a: Count, b: Count): number {
        return b.count - a.count;
    });
    return result;
}

function sendResult(response: Response, result: CountResult) {
    response.status(200).json(result);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting logs summary: " + error.message);
    response.status(400).send(error.message);
}

function parseJson(obj: string) {
    try {
        return JSON.parse(obj);
    } catch (err) {
        return undefined;
    }
}