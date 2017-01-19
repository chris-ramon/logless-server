/**
 * Created by chrsdietz on 01/16/16.
 */
import { Request, Response } from "express";

import { getDateRange } from "./query-utils";

import Log, { ILog } from "../lib/log";
import Console from "../lib/console-utils";

import { counter, Count, CountResult } from "../lib/counter";

export default function (req: Request, res: Response): Promise<CountResult> {
    const reqQuer = Object.assign({}, req.query);

    const query: any = {};

    getDateRange(req, query);

    if (reqQuer.source) {
        Object.assign(query, { source: reqQuer.source });
    }

    Object.assign(query, { "payload.request": { $exists: true } });

    Console.log("Querying for intent count summary");
    Console.log(query);

    return Log.find(query)
        .then(function (logs: any[]) {
            return createSummary(logs);
        }).then(function (result: CountResult) {
            return sort(result, reqQuer.count_sort);
        })
        .then(function (result: CountResult) {
            sendResult(res, result);
            return result;
        })
        .catch(function (err: Error) {
            errorOut(err, res);
            return { count: [] };
        });
}

function createSummary(logs: ILog[]): CountResult {
    return counter({
        length() {
            return logs.length;
        },
        name(index: number) {
            const payload = logs[index].payload;
            return payload.request.type;
        }
    });
}

function sort(result: CountResult, direction: string): CountResult {
    if (direction === "desc") {
        result.count.sort(function (a: Count, b: Count): number {
            return b.count - a.count;
        });
    } else if (direction === "asc") {
        result.count.sort(function (a: Count, b: Count): number {
            return a.count - b.count;
        });
    }
    return result;
}

function sendResult(response: Response, result: CountResult) {
    response.status(200).json(result);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting logs summary: " + error.message);
    response.status(400).send(error.message);
}