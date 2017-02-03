/**
 * Created by chrsdietz on 01/16/16.
 */
import * as moment from "moment";
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
    const reqQuer = Object.assign({}, req.query) as TimeQuery;

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
        $group: getGroup(reqQuer)
    });

    let isSorted: boolean = false;
    if (reqQuer.date_sort) {
        const query = getSort(reqQuer);
        if (query) {
            isSorted = true;
            aggregation.push({
                $sort: getSort(reqQuer)
            });
        }
    }

    console.info("isSorted = " + isSorted + " " + reqQuer.fill_gaps);
    const shouldFillGaps = (reqQuer.fill_gaps !== undefined) ? isSorted : false;

    return Log.aggregate(aggregation)
        .then(function (results: any[]): TimeBucket[] {
            return results.map(function (value: any, index: number, array: any[]): TimeBucket {
                return new ParsedTimeBucket(value);
            });
        }).then(function (buckets: TimeBucket[]): TimeSummary {
            const timeSummary: TimeSummary = {
                buckets: buckets
            };
            return timeSummary;
        }).then(function (timeSummary: TimeSummary) {
            console.info("fill gapes = " + shouldFillGaps);
            if (shouldFillGaps) {
                return fillGaps(timeSummary);
            } else {
                console.info("not filling");
                return timeSummary;
            }
        }).then(function (timeSummary: TimeSummary) {
            sendOut(timeSummary, res);
            return timeSummary;
        }).catch(function (err: Error) {
            errorOut(err, res);
            return { buckets: [] };
        });
}

function sendOut(summary: TimeSummary, response: Response) {
    response.status(200).json(summary);
}

function errorOut(error: Error, response: Response) {
    Console.info("Error getting logs summary: " + error.message);
    response.status(400).send(error.message);
}

function getGroup(reqQuer: TimeQuery): any {
    const base = {
        _id: {
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
            year: { $year: "$timestamp" }
        },
        count: {
            $sum: 1
        }
    };

    if (reqQuer.granularity === "hour") {
        base._id = Object.assign(base._id, { hour: { $hour: "$timestamp" } });
    }

    return base;
}

function getSort(reqQuer: TimeQuery): any {
    let sortVal: number = undefined;
    if (reqQuer.date_sort === "asc") {
        sortVal = 1;
    } else if (reqQuer.date_sort === "desc") {
        sortVal = -1;
    };

    let value = (sortVal) ? {
        "_id.year": sortVal,
        "_id.month": sortVal,
        "_id.day": sortVal
    } : undefined;

    if (value) {
        if (reqQuer.granularity === "hour") {
            value = Object.assign(value, { "_id.hour": sortVal });
        }
    }
    return value;
}

export function fillGaps(summary: TimeSummary, dateRange: DateRange = {}): Promise<TimeSummary> {
    const buckets = summary.buckets;
    if (buckets.length === 0) {
        const gaps: TimeBucket[] = fillGapInclusive(dateRange.start_time, dateRange.end_time);
        const newSummary: TimeSummary = Object.assign({}, summary, { buckets: gaps });
        return Promise.resolve(newSummary);
    }

    const firstBucketDate = moment(buckets[0].date);
    const lastBucketDate = moment(buckets[buckets.length - 1].date);

    let startDate: moment.Moment = firstBucketDate;
    if (dateRange.start_time) {
        startDate = dateRange.start_time;
        const increasing = startDate.isBefore(firstBucketDate);
        if (increasing) {
            startDate.subtract(1, "hours");
        } else {
            startDate.add(1, "hours");
        }
    }

    let endDate: moment.Moment = lastBucketDate;
    if (dateRange.end_time) {
        endDate = dateRange.end_time;
    }

    let bucketCopy = buckets.slice();
    let currentDate = startDate.clone();
    let copyIndex = 0;

    const max = bucketCopy.length;

    for (let i = 0; i < max; ++i) {
        const bucketDate = moment(buckets[i].date);

        const gaps: TimeBucket[] = fillGap(currentDate, bucketDate);
        gaps.shift(); // Removing the first one as it's included in the current data.
        bucketCopy.splice(copyIndex, 0, ...gaps);

        copyIndex += gaps.length + 1; // Skip the next one because that's where the bucket exists.
        currentDate = bucketDate;
    }

    const remaining: TimeBucket[] = fillGapInclusive(currentDate, endDate);
    remaining.shift();
    bucketCopy = bucketCopy.concat(remaining);

    const newSummary: TimeSummary = Object.assign({}, summary, { buckets: bucketCopy });
    return Promise.resolve(newSummary);
}

export function fillGapInclusive(from: moment.Moment, to: moment.Moment): TimeBucket[] {
    if (errorCheck(from, to)) {
        return [];
    }

    const increasing: boolean = from.isBefore(to);
    return generateGap(increasing, from, to);
}

export function fillGap(from: moment.Moment, to: moment.Moment): TimeBucket[] {
    if (errorCheck(from, to)) {
        return [];
    }

    const increasing: boolean = from.isBefore(to);
    const end = moment(to);
    if (increasing) {
        end.subtract(1, "hours");
    } else {
        end.add(1, "hours");
    }

    return generateGap(increasing, from, end);
}

function errorCheck(from: moment.Moment, to: moment.Moment): boolean {
    if (!from) {
        return true;
    }
    if (!to) {
        return true;
    }
    if (from.isSame(to)) {
        return true;
    }
    return false;
}

function generateGap(increasing: boolean, start: moment.Moment, end: moment.Moment): TimeBucket[] {
    const buckets: TimeBucket[] = [];
    const currentDate = moment(start);
    while (whileCheck(increasing, currentDate, end)) {
        buckets.push({
            date: currentDate.toDate(),
            count: 0
        });

        adjust(increasing, currentDate);
    }
    return buckets;
}

function whileCheck(increasing: boolean, currentDate: moment.Moment, to: moment.Moment) {
    if (increasing) {
        return currentDate.isSameOrBefore(to);
    } else {
        return currentDate.isSameOrAfter(to);
    }
}

function adjust(increasing: boolean, currentDate: moment.Moment) {
    if (increasing) {
        currentDate.add(1, "hours");
    } else {
        currentDate.subtract(1, "hours");
    }
}

interface TimeQuery {
    source: string; // source ID
    start_time?: string; // ISO time formatted
    end_time?: string; // ISO time formatted
    date_sort?: "asc" | "desc";
    granularity?: "hour" | "day";
    fill_gaps?: boolean;
}

interface DateRange {
    start_time?: moment.Moment;
    end_time?: moment.Moment;
}

class ParsedTimeBucket implements TimeBucket {
    date: Date;
    count: number;

    constructor(value: any) {
        // The month parameter starts at 0 index where-as the query starts at 1.  So subtract 1.
        this.date = new Date(value._id.year, value._id.month - 1, value._id.day, 0, 0, 0, 0),
            this.count = value.count;

        if (value._id.hour) {
            this.date.setHours(value._id.hour - 1);
        }
    }
}