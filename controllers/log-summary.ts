/**
 * Created by chrsdietz on 01/16/16.
 */
import * as moment from "moment";
import { Request, Response } from "express";

import { getDateRange } from "./query-utils";

import Log from "../lib/log";
import { TimeBucket, TimeSummary } from "../lib/time-bucket";

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

    let totalAggregation = [];
    let amazonAggregation = [];
    let googleHomeAggregation = [];

    const sharedGroup = getGroup(reqQuer);

    totalAggregation.push({
        $match: query
    });

    totalAggregation.push({
        $group: sharedGroup
    });

    amazonAggregation.push({
        $match: Object.assign({}, query, { $or: [{ "payload.request": { $exists: true } }, { "payload.response": { $exists: true } }] })
    });

    amazonAggregation.push({
        $group: sharedGroup
    });

    googleHomeAggregation.push({
        $match: Object.assign({}, query, { $or: [{ "payload.result": { $exists: true } }, { "payload.speech": { $exists: true } }] })
    });

    googleHomeAggregation.push({
        $group: sharedGroup
    });

    let isSorted: boolean = false;
    if (reqQuer.date_sort === "asc" || reqQuer.date_sort === "desc") {
        const query = getSort(reqQuer);
        if (query) {
            isSorted = true;
            totalAggregation.push({
                $sort: query
            });
            amazonAggregation.push({
                $sort: query
            });
            googleHomeAggregation.push({
                $sort: query
            });
        }
    }

    const shouldFillGaps: boolean = reqQuer.fill_gaps !== undefined && reqQuer.fill_gaps && isSorted;
    const gran: Granularity = (reqQuer.granularity === "hour") ? "hour" : "day";

    return Log.aggregate(totalAggregation)
        .then(mapResults)
        .then(function (buckets: TimeBucket[]): TimeSummary {
            const timeSummary: TimeSummary = {
                buckets: buckets
            };
            return timeSummary;
        }).then(function (timeSummary: TimeSummary) {
            return Log.aggregate(amazonAggregation)
                .then(mapResults)
                .then(function(buckets: TimeBucket[]) {
                    timeSummary.amazonBuckets = buckets;
                    return timeSummary;
                });
        }).then(function (timeSummary: TimeSummary) {
            return Log.aggregate(googleHomeAggregation)
                .then(mapResults)
                .then(function(buckets: TimeBucket[]) {
                    timeSummary.googleBuckets = buckets;
                    return timeSummary;
                });
        }).then(function (timeSummary: TimeSummary) {
            if (shouldFillGaps) {
                const range = dateRange(reqQuer);
                const granul = granularity(reqQuer, gran);
                return fillGaps(timeSummary, range, granul, reqQuer.date_sort);
            }
            return timeSummary;
        }).then(function (timeSummary: TimeSummary) {
            sendOut(timeSummary, res);
            return timeSummary;
        }).catch(function (err: Error) {
            errorOut(err, res);
            return { buckets: [] };
        });
}

function mapResults(results: any[]): TimeBucket[] {
    return results.map(function (value: any, index: number, array: any[]): TimeBucket {
        return new ParsedTimeBucket(value);
    });
}

function sendOut(summary: TimeSummary, response: Response) {
    response.status(200).json(summary);
}

function errorOut(error: Error, response: Response) {
    response.status(400).send(error.message);
}

function getGroup(reqQuer: TimeQuery): any {
    const base = {
        _id: {
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
            year: { $year: "$timestamp" }
        },
        transactions: { $addToSet: "$transaction_id" }
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

function granularity(reqQuer: TimeQuery, defaultResult: Granularity): Granularity {
    if (reqQuer.granularity) {
        if (reqQuer.granularity === "hour") {
            return "hour";
        } else if (reqQuer.granularity === "day") {
            return "day";
        }
    }
    return defaultResult;
}

function dateRange(reqQuer: TimeQuery): DateRange {
    let dateRange = {};
    if (reqQuer.start_time) {
        const startMoment = moment(reqQuer.start_time);
        if (startMoment.isValid()) {
            Object.assign(dateRange, { start_time: startMoment });
        }
    }

    if (reqQuer.end_time) {
        const endMoment = moment(reqQuer.end_time);
        if (endMoment.isValid()) {
            Object.assign(dateRange, { end_time: endMoment });
        }
    }

    return dateRange;
}

export function fillGaps(summary: TimeSummary, dateRange: DateRange = {}, granularity: Granularity = "hour", sortOrder: "asc" | "desc" = "asc"): Promise<TimeSummary> {
    const newSummary: TimeSummary = { buckets: fillGapsInBucket(summary.buckets, dateRange, granularity, sortOrder) };
    newSummary.amazonBuckets = fillGapsInBucket(summary.amazonBuckets, dateRange, granularity, sortOrder);
    newSummary.googleBuckets = fillGapsInBucket(summary.googleBuckets, dateRange, granularity, sortOrder);
    return Promise.resolve(newSummary);
}

export function fillGapsInBucket(buckets: TimeBucket[] = [], dateRange: DateRange = {}, granularity: Granularity = "hour", sortOrder: "asc" | "desc" = "asc") {
    const increasing = sortOrder === "asc";

    if (buckets.length === 0) {
        const start = (increasing) ? dateRange.start_time : dateRange.end_time;
        const end = (increasing) ? dateRange.end_time : dateRange.start_time;
        const gaps: TimeBucket[] = fillGapInclusive(start, end, granularity);
        return gaps;
    }

    let startDate: moment.Moment = moment(buckets[0].date);
    let endDate: moment.Moment = moment(buckets[buckets.length - 1].date);

    if (increasing) {
        if (dateRange.start_time) {
            startDate = dateRange.start_time;
            startDate.subtract(1, granularity);
        }
        if (dateRange.end_time) {
            endDate = dateRange.end_time;
        }
    } else {
        if (dateRange.start_time) {
            endDate = dateRange.start_time;
        }
        if (dateRange.end_time) {
            startDate = dateRange.end_time;
            startDate.add(1, granularity);
        }
    }

    let bucketCopy = buckets.slice();
    let currentDate = startDate.clone();
    let copyIndex = 0;

    const max = bucketCopy.length;

    for (let i = 0; i < max; ++i) {
        const bucketDate = moment(buckets[i].date);

        const gaps: TimeBucket[] = fillGap(currentDate, bucketDate, granularity);
        gaps.shift(); // Removing the first one as it's included in the current data.
        bucketCopy.splice(copyIndex, 0, ...gaps);

        copyIndex += gaps.length + 1; // Skip the next one because that's where the bucket exists.
        currentDate = bucketDate;
    }

    const remaining: TimeBucket[] = fillGapInclusive(currentDate, endDate, granularity);
    remaining.shift();
    return bucketCopy.concat(remaining);
}

export function fillGapInclusive(from: moment.Moment, to: moment.Moment, granularity: Granularity): TimeBucket[] {
    if (errorCheck(from, to)) {
        return [];
    }

    const increasing: boolean = from.isBefore(to);
    return generateGap(increasing, from, to, granularity);
}

export function fillGap(from: moment.Moment, to: moment.Moment, granularity: Granularity): TimeBucket[] {
    if (errorCheck(from, to)) {
        return [];
    }

    const increasing: boolean = from.isBefore(to);
    const end = moment(to);
    if (increasing) {
        end.subtract(1, granularity);
    } else {
        end.add(1, granularity);
    }

    return generateGap(increasing, from, end, granularity);
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

function generateGap(increasing: boolean, start: moment.Moment, end: moment.Moment, granularity: Granularity): TimeBucket[] {
    const buckets: TimeBucket[] = [];
    const currentDate = moment(start);
    while (whileCheck(increasing, currentDate, end)) {
        buckets.push({
            date: currentDate.toDate(),
            count: 0
        });

        adjust(increasing, currentDate, granularity);
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

function adjust(increasing: boolean, currentDate: moment.Moment, granularity: Granularity) {
    if (increasing) {
        currentDate.add(1, granularity);
    } else {
        currentDate.subtract(1, granularity);
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

type Granularity = "hour" | "day";

class ParsedTimeBucket implements TimeBucket {
    date: Date;
    count: number;

    constructor(value: any) {
        // The month parameter starts at 0 index where-as the query starts at 1.  So subtract 1.
        this.date = new Date(value._id.year, value._id.month - 1, value._id.day, 0, 0, 0, 0);
        this.count = value.transactions.length;

        if (value._id.hour) {
            this.date.setHours(value._id.hour - 1);
        }
    }
}