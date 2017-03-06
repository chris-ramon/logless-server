import * as moment from "moment";

export enum Granularity {
    "day", "hour"
}

export interface Timestamped {
    timestamp: Date;
}

export interface TimeSummary {
    buckets: TimeBucket[];
    amazonBuckets?: TimeBucket[];
    googleBuckets?: TimeBucket[];
}

export interface TimeBucket {
    date: Date;
    count: number;
}

export function getTimeSummary<T extends Timestamped>(items: T[], granularity: Granularity = Granularity.day): TimeSummary {
    let bucketMap: { [timestamp: string]: TimeBucket } = {};
    const timeSummary: TimeSummary = { buckets: []};

    for (let i = 0; i < items.length; ++i) {
        const itemDate: moment.Moment = moment(items[i].timestamp);
        const nearestDay = (granularity === Granularity.day) ? itemDate.startOf("date") : itemDate.startOf("hour");

        const key = nearestDay.toISOString();
        let timeBucket: TimeBucket = bucketMap[key];
        if (!timeBucket) {
            timeBucket = newBucket(nearestDay.toDate());
            bucketMap[key] = timeBucket;
            timeSummary.buckets.push(timeBucket);
        }

        ++timeBucket.count;
    }

    return timeSummary;
}

function newBucket(date: Date): TimeBucket {
    return {
        date: date,
        count: 0
    };
}