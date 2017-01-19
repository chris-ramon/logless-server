import * as Chai from "chai";

import * as TB from "../../lib/time-bucket";

Chai.use(require("chai-datetime"));
const expect = Chai.expect;

class Item implements TB.Timestamped {

    timestamp: Date;

    constructor(date: Date) {
        this.timestamp = date;
    }
}

describe("Time Bucket Tests", function () {
    it("Tests the dates are sorted in to respective time buckets by day.", function () {
        let items: Item[] = [];
        let date: Date = new Date();
        for (let i = 0; i < 10; i++) {
            for (let j = i; j < 10; j++) {
                const newItem = new Item(new Date(date.toISOString()));
                items.push(newItem);
            }
            date.setDate(date.getDate() - 1);
        }

        const timeSummary: TB.TimeSummary = TB.getTimeSummary(items);

        expect(timeSummary.buckets).to.have.length(10);

        let j = 0;
        let lastDay: Date;
        for (let i = 0; i < 10; i++) {
            const bucket: TB.TimeBucket = timeSummary.buckets[i];
            expect(bucket.count).to.equal(10 - i);
            expect(bucket.date).to.equalDate(items[j].timestamp);
            // Checking that it's indeed one day less than the previous.
            if (i > 0) {
                expect(lastDay.getDate() - 1).to.equal(bucket.date.getDate());
            }
            lastDay = bucket.date;
            j += 10 - i; // Will knock us to the first index of the next item bucket. 
        }
    });

    it("Tests the dates are sorted in to respective time buckets by hour.", function () {
        let items: Item[] = [];
        let date: Date = new Date();
        for (let i = 0; i < 10; i++) {
            for (let j = i; j < 10; j++) {
                const newItem = new Item(new Date(date.toISOString()));
                items.push(newItem);
            }
            date.setHours(date.getHours() - 1);
        }

        const timeSummary: TB.TimeSummary = TB.getTimeSummary(items, TB.Granularity.hour);

        expect(timeSummary.buckets).to.have.length(10);

        let j = 0;
        let lastDay: Date;
        for (let i = 0; i < 10; i++) {
            const bucket: TB.TimeBucket = timeSummary.buckets[i];
            expect(bucket.count).to.equal(10 - i);
            expect(bucket.date).to.equalDate(items[j].timestamp);
            // Checking that it's indeed one hour less than the previous.
            if (i > 0) {
                expect(lastDay.getHours() - 1).to.equal(bucket.date.getHours());
            }
            lastDay = bucket.date;
            j += 10 - i; // Will knock us to the first index of the next item bucket. 
        }
    });
});