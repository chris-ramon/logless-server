import * as Chai from "chai";
import * as moment from "moment";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";

import { Request, Response } from "express";

import Log from "../../lib/log";
import { TimeBucket, TimeSummary } from "../../lib/time-bucket";

import logSummary, { fillGap, fillGaps } from "../../controllers/log-summary";


Chai.use(SinonChai);
const expect = Chai.expect;

const NUM_OF_AGGS = 6;

describe("Log time summary", function () {

    let logAggregate: Sinon.SinonStub;
    let mockRequest: Request;
    let mockResponse: Response;

    let statusStub: Sinon.SinonStub;
    let jsonStub: Sinon.SinonStub;
    let sendStub: Sinon.SinonStub;

    let today: Date = new Date();

    beforeEach(function () {
        mockRequest = <Request>{};
        mockRequest.query = {};

        mockResponse = <Response>{};
        mockResponse.status = statusStub = Sinon.stub().returnsThis();
        mockResponse.send = sendStub = Sinon.stub().returnsThis();
        mockResponse.json = jsonStub = Sinon.stub().returnsThis();
    });

    describe("Successfull queries to the database.", function () {

        before(function () {
            let dummyAggs: Aggregate[] = dummyAggregates(NUM_OF_AGGS);
            logAggregate = Sinon.stub(Log, "aggregate").returns(Promise.resolve(dummyAggs));
        });

        beforeEach(function () {
            logAggregate.reset();
        });

        after(function () {
            logAggregate.restore();
        });

        it("Tests the basic query.", function () {
            const startOfToday = new Date(today.toISOString());
            startOfToday.setHours(0, 0, 0, 0);

            return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                // expect(logAggregate).to.have.been.calledOnce;  // Once is ideal, but it"s calling three times for each device and total.  This can"t be fixed until server upgrades to MongoDB 3.4.
                expect(logAggregate).to.have.been.called;

                expect(summary).to.exist;
                expect(summary.buckets).to.have.length(NUM_OF_AGGS);

                expect(statusStub).to.be.calledWithExactly(200);

                expect(jsonStub).to.have.been.calledOnce;
                expect(jsonStub).to.have.been.calledWithExactly(summary);
            });
        });

        describe("Tests the queries are properly set.", function () {
            it("Tests the source query", function () {
                mockRequest.query = { source: "ABC123" };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    expect(logAggregate).to.be.called;
                });
            });

            it("Tests the start time query", function () {
                mockRequest.query = { start_time: today.toISOString() };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    const firstCallArgs = logAggregate.args[0][0];
                    const matchArgs = firstCallArgs[0]["$match"];
                    const timestamp = matchArgs.timestamp;

                    expect(timestamp).to.exist;
                    expect(timestamp["$gte"]).to.equalDate(today);
                    // expect(logAggregate).to.be.calledWith([{ $match: { timestamp: { $gte: today } } }, baseGroup]);
                });
            });

            it("Tests the end time query", function () {
                mockRequest.query = { end_time: today };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    const firstCallArgs = logAggregate.args[0][0];
                    const matchArgs = firstCallArgs[0]["$match"];
                    const timestamp = matchArgs.timestamp;

                    expect(timestamp).to.exist;
                    expect(timestamp["$lte"]).to.equalDate(today);
                });
            });

            it("Tests the sort query with ascending", function () {
                mockRequest.query = { date_sort: "asc" };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    const firstCallArgs = logAggregate.args[0][0];
                    const sortArgs = firstCallArgs[2]["$sort"];

                    expect(sortArgs).to.exist;
                    expect(sortArgs["_id.year"]).to.equal(1);
                    expect(sortArgs["_id.month"]).to.equal(1);
                    expect(sortArgs["_id.day"]).to.equal(1);
                });
            });

            it("Tests the sort query descending", function () {
                mockRequest.query = { date_sort: "desc" };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    const firstCallArgs = logAggregate.args[0][0];
                    const sortArgs = firstCallArgs[2]["$sort"];

                    expect(sortArgs).to.exist;
                    expect(sortArgs["_id.year"]).to.equal(-1);
                    expect(sortArgs["_id.month"]).to.equal(-1);
                    expect(sortArgs["_id.day"]).to.equal(-1);
                });
            });

            it("Tests the sort query is ignored with invalid entry.", function () {
                mockRequest.query = { date_sort: "noop" };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    const firstCallArgs = logAggregate.args[0][0];

                    expect(firstCallArgs[2]).to.not.exist;
                });
            });
        });
    });

    describe("Fill gaps", function () {
        describe("function \"fillGap\"", function () {

            describe("Hour Granularity", function () {
                it("Tests the gaps are fill in between the two dates that are increasing.", function () {
                    const startDate: moment.Moment = moment([2017, 0, 14]);
                    const endDate: moment.Moment = moment([2017, 0, 15]);

                    const buckets: TimeBucket[] = fillGap(startDate, endDate, "hour");

                    expect(buckets).to.have.length(24); // It won"t include the end.

                    const checkDate = moment(startDate);
                    for (let bucket of buckets) {
                        expect(bucket.count).to.equals(0);
                        expect(bucket.date).to.equalDate(checkDate.toDate());
                        expect(bucket.date).to.equalTime(checkDate.toDate());
                        checkDate.add(1, "hour");
                    }
                });

                it("Tests the gaps are fill in between the two dates that are increasing.", function () {
                    const startDate: moment.Moment = moment([2017, 0, 15]);
                    const endDate: moment.Moment = moment([2017, 0, 14]);

                    const buckets: TimeBucket[] = fillGap(startDate, endDate, "hour");

                    expect(buckets).to.have.length(24); // It won"t include the end.

                    const checkDate = moment(startDate);
                    for (let bucket of buckets) {
                        expect(bucket.count).to.equals(0);
                        expect(bucket.date).to.equalDate(checkDate.toDate());
                        expect(bucket.date).to.equalTime(checkDate.toDate());
                        checkDate.subtract(1, "hour");
                    }
                });

                it("Tests the gaps are not filled when dates are equal.", function () {
                    const startDate: moment.Moment = moment([2017, 0, 15]);
                    const endDate: moment.Moment = moment([2017, 0, 15]);

                    const buckets: TimeBucket[] = fillGap(startDate, endDate, "hour");

                    expect(buckets).to.be.empty;
                });

                it("Tests nothing is returned when the \"from\" parameter is undefined.", function () {
                    const endDate: moment.Moment = moment([2017, 0, 15]);

                    const buckets: TimeBucket[] = fillGap(undefined, endDate, "hour");

                    expect(buckets).to.be.empty;
                });

                it("Tests nothing is returned when the \"to\" parameter is undefined.", function () {
                    const endDate: moment.Moment = moment([2017, 0, 15]);

                    const buckets: TimeBucket[] = fillGap(endDate, undefined, "hour");

                    expect(buckets).to.be.empty;
                });
            });

            describe("Day Granularity", function () {
                it("Tests the gaps are fill in between the two dates that are increasing.", function () {
                    const startDate: moment.Moment = moment([2017, 0, 14]);
                    const endDate: moment.Moment = moment([2017, 0, 20]);

                    const buckets: TimeBucket[] = fillGap(startDate, endDate, "day");

                    expect(buckets).to.have.length(6); // It won"t include the end.

                    const checkDate = moment(startDate);
                    for (let bucket of buckets) {
                        expect(bucket.count).to.equals(0);
                        expect(bucket.date).to.equalDate(checkDate.toDate());
                        expect(bucket.date).to.equalTime(checkDate.toDate());
                        checkDate.add(1, "day");
                    }
                });

                it("Tests the gaps are fill in between the two dates that are increasing.", function () {
                    const startDate: moment.Moment = moment([2017, 0, 15]);
                    const endDate: moment.Moment = moment([2017, 0, 10]);

                    const buckets: TimeBucket[] = fillGap(startDate, endDate, "day");

                    expect(buckets).to.have.length(5); // It won"t include the end.

                    const checkDate = moment(startDate);
                    for (let bucket of buckets) {
                        expect(bucket.count).to.equals(0);
                        expect(bucket.date).to.equalDate(checkDate.toDate());
                        expect(bucket.date).to.equalTime(checkDate.toDate());
                        checkDate.subtract(1, "day");
                    }
                });

                it("Tests the gaps are not filled when dates are equal.", function () {
                    const startDate: moment.Moment = moment([2017, 0, 15]);
                    const endDate: moment.Moment = moment([2017, 0, 15]);

                    const buckets: TimeBucket[] = fillGap(startDate, endDate, "day");

                    expect(buckets).to.be.empty;
                });

                it("Tests nothing is returned when the \"from\" parameter is undefined.", function () {
                    const endDate: moment.Moment = moment([2017, 0, 15]);

                    const buckets: TimeBucket[] = fillGap(undefined, endDate, "day");

                    expect(buckets).to.be.empty;
                });

                it("Tests nothing is returned when the \"to\" parameter is undefined.", function () {
                    const endDate: moment.Moment = moment([2017, 0, 15]);

                    const buckets: TimeBucket[] = fillGap(endDate, undefined, "day");

                    expect(buckets).to.be.empty;
                });
            });
        });

        describe("function \"fillGaps\"", function () {
            describe("Hours Granularity", function () {

                it("Tests the gaps are filled between the three buckets while increasing", function () {
                    const summary: TimeSummary = dummySummary(10, true);

                    const currentDay: moment.Moment = moment(summary.buckets[0].date);
                    return fillGaps(summary).then(function (newSummary: TimeSummary) {
                        let j = 0;
                        for (let i = 0; i < newSummary.buckets.length; i++) {
                            // The day should be every 24 hours.
                            if (i % 24 === 0) {
                                expect(summary.buckets[j]).to.deep.equal(newSummary.buckets[i]);
                                ++j;
                            } else {
                                expect(newSummary.buckets[i].date).to.equalDate(currentDay.toDate());
                                expect(newSummary.buckets[i].count).to.equal(0);
                            }
                            currentDay.add(1, "hours");
                        }
                    });
                });

                it("Tests the gaps are filled between the three buckets while decreasing", function () {
                    const summary: TimeSummary = dummySummary(10, false);

                    const currentDay: moment.Moment = moment(summary.buckets[0].date);
                    return fillGaps(summary).then(function (newSummary: TimeSummary) {
                        let j = 0;
                        for (let i = 0; i < newSummary.buckets.length; i++) {
                            // The day should be every 24 hours.
                            if (i % 24 === 0) {
                                expect(summary.buckets[j]).to.deep.equal(newSummary.buckets[i]);
                                ++j;
                            } else {
                                expect(newSummary.buckets[i].date).to.equalDate(currentDay.toDate());
                                expect(newSummary.buckets[i].count).to.equal(0);
                            }
                            currentDay.subtract(1, "hours");
                        }
                    });
                });

                it("Tests the TimeSummary does not get updated.", function () {
                    const firstBucket: TimeBucket = { date: moment([2017, 0, 15]).toDate(), count: 100 };
                    const secondBucket: TimeBucket = { date: moment([2017, 0, 16]).toDate(), count: 200 };
                    const summary: TimeSummary = { buckets: [firstBucket, secondBucket] };

                    return fillGaps(summary).then(function (newSummary: TimeSummary) {
                        expect(summary.buckets).to.have.length(2);
                        expect(summary).to.not.deep.equal(newSummary);
                        expect(summary.buckets[0].date).to.equalDate(firstBucket.date);
                        expect(summary.buckets[0].count).to.equal(firstBucket.count);
                        expect(summary.buckets[1].date).to.equalDate(secondBucket.date);
                        expect(summary.buckets[1].count).to.equal(secondBucket.count);
                    });
                });

                it("Tests that no bucket is filled when there are no buckets in summary.", function () {
                    const summary: TimeSummary = dummySummary(0, true);

                    return fillGaps(summary).then(function (newSummary: TimeSummary) {
                        expect(newSummary.buckets).to.have.length(0);
                    });
                });

                it("Fills in gaps when a date range is provided and summary is empty.", function () {
                    const summary: TimeSummary = dummySummary(0, true);
                    const dateRange = { start_time: moment([2017, 0, 15]), end_time: moment([2017, 0, 16]) };

                    const checkDate = moment(dateRange.start_time);

                    return fillGaps(summary, dateRange).then(function (newSummary: TimeSummary) {
                        expect(newSummary.buckets).to.have.length(25); // Should be 25 as in all day plus the ending hour.

                        for (let i = 0; i < newSummary.buckets.length; ++i) {
                            expect(newSummary.buckets[i].date).to.equalDate(checkDate.toDate());
                            expect(newSummary.buckets[i].count).to.equal(0);
                            checkDate.add(1, "hour");
                        }
                    });
                });

                it("Fills in gaps when a date range is provided and summary is empty and descreasing.", function () {
                    const summary: TimeSummary = dummySummary(0, false);
                    const dateRange = { start_time: moment([2017, 0, 15]), end_time: moment([2017, 0, 16]) };

                    const checkDate = moment(dateRange.end_time);

                    return fillGaps(summary, dateRange, "hour", "desc").then(function (newSummary: TimeSummary) {
                        expect(newSummary.buckets).to.have.length(25); // Should be 25 as in all day plus the ending hour.

                        for (let i = 0; i < newSummary.buckets.length; ++i) {
                            expect(newSummary.buckets[i].date).to.equalTime(checkDate.toDate());
                            expect(newSummary.buckets[i].count).to.equal(0);
                            checkDate.subtract(1, "hour");
                        }
                    });
                });

                it("Fills in gaps on ends when summary is provided.", function () {
                    const summary: TimeSummary = dummySummary(2, true);
                    const firstDate: moment.Moment = moment(summary.buckets[0].date).subtract(1, "days");
                    const lastDate: moment.Moment = moment(summary.buckets[summary.buckets.length - 1].date).add(1, "days");
                    const dateRange = { start_time: firstDate, end_time: lastDate };

                    const checkDate = moment(firstDate);

                    return fillGaps(summary, dateRange).then(function (newSummary: TimeSummary) {
                        expect(newSummary.buckets).to.have.length(3 * 24 + 1); // Day before, day between, day after plus the hour that we started.

                        const max = newSummary.buckets.length;
                        const maxMinusOne = max - 1;
                        for (let i = 0; i < max; ++i) {
                            expect(newSummary.buckets[i].date).to.equalDate(checkDate.toDate());
                            if (i > 0 && i < maxMinusOne && i % 24 === 0) {
                                expect(newSummary.buckets[i].count).to.equal(100);
                            } else {
                                expect(newSummary.buckets[i].count).to.equal(0);
                            }
                            checkDate.add(1, "hour");
                        }
                    });
                });
            });

            describe("Days Granularity", function () {
                it("Tests the gaps are filled between the three buckets while increasing", function () {
                    const summary: TimeSummary = dummySummary(10, true, 5);

                    const currentDay: moment.Moment = moment(summary.buckets[0].date);
                    return fillGaps(summary, {}, "day").then(function (newSummary: TimeSummary) {

                        expect(newSummary.buckets).to.have.length(10 + 4 * 9); // original 10 + the 4 between each which are 9 gaps.

                        let j = 0;
                        for (let i = 0; i < newSummary.buckets.length; i++) {
                            // The day should be every 24 hours.
                            if (i % 5 === 0) {
                                expect(summary.buckets[j]).to.deep.equal(newSummary.buckets[i]);
                                ++j;
                            } else {
                                expect(newSummary.buckets[i].date).to.equalDate(currentDay.toDate());
                                expect(newSummary.buckets[i].count).to.equal(0);
                            }
                            currentDay.add(1, "days");
                        }
                    });
                });

                it("Tests the gaps are filled between the three buckets while decreasing", function () {
                    const summary: TimeSummary = dummySummary(10, false, 5);

                    const currentDay: moment.Moment = moment(summary.buckets[0].date);
                    return fillGaps(summary, {}, "day").then(function (newSummary: TimeSummary) {

                        console.log(newSummary);
                        expect(newSummary.buckets).to.have.length(10 + 4 * 9); // original 10 + the 4 between each which are 9 gaps.

                        let j = 0;
                        for (let i = 0; i < newSummary.buckets.length; i++) {
                            // The day should be every 24 hours.
                            if (i % 5 === 0) {
                                expect(summary.buckets[j]).to.deep.equal(newSummary.buckets[i]);
                                ++j;
                            } else {
                                expect(newSummary.buckets[i].date).to.equalDate(currentDay.toDate());
                                expect(newSummary.buckets[i].count).to.equal(0);
                            }
                            currentDay.subtract(1, "days");
                        }
                    });
                });

                it("Tests the TimeSummary does not get updated.", function () {
                    const firstBucket: TimeBucket = { date: moment([2017, 0, 15]).toDate(), count: 100 };
                    const secondBucket: TimeBucket = { date: moment([2017, 0, 20]).toDate(), count: 200 };
                    const summary: TimeSummary = { buckets: [firstBucket, secondBucket] };

                    return fillGaps(summary, "days").then(function (newSummary: TimeSummary) {
                        expect(summary.buckets).to.have.length(2);
                        expect(summary).to.not.deep.equal(newSummary);
                        expect(summary.buckets[0].date).to.equalDate(firstBucket.date);
                        expect(summary.buckets[0].count).to.equal(firstBucket.count);
                        expect(summary.buckets[1].date).to.equalDate(secondBucket.date);
                        expect(summary.buckets[1].count).to.equal(secondBucket.count);
                    });
                });

                it("Tests that no bucket is filled when there are no buckets in summary.", function () {
                    const summary: TimeSummary = dummySummary(0, true);

                    return fillGaps(summary, "days").then(function (newSummary: TimeSummary) {
                        expect(newSummary.buckets).to.have.length(0);
                    });
                });

                it("Fills in gaps when a date range is provided and summary is empty.", function () {
                    const summary: TimeSummary = dummySummary(0, true);
                    const dateRange = { start_time: moment([2017, 0, 15]), end_time: moment([2017, 1, 15]) };

                    const checkDate = moment(dateRange.start_time);

                    return fillGaps(summary, dateRange, "day").then(function (newSummary: TimeSummary) {
                        expect(newSummary.buckets).to.have.length(32); // January length + start day.

                        for (let i = 0; i < newSummary.buckets.length; ++i) {
                            expect(newSummary.buckets[i].date).to.equalDate(checkDate.toDate());
                            expect(newSummary.buckets[i].count).to.equal(0);
                            checkDate.add(1, "days");
                        }
                    });
                });

                it("Fills in gaps when a date range is provided and summary is and decreasing.", function () {
                    const summary: TimeSummary = dummySummary(0, false);
                    const dateRange = { start_time: moment([2017, 0, 15]), end_time: moment([2017, 1, 15]) };

                    const checkDate = moment(dateRange.end_time);

                    return fillGaps(summary, dateRange, "day", "desc").then(function (newSummary: TimeSummary) {
                        expect(newSummary.buckets).to.have.length(32); // January length + start day.

                        for (let i = 0; i < newSummary.buckets.length; ++i) {
                            expect(newSummary.buckets[i].date).to.equalDate(checkDate.toDate());
                            expect(newSummary.buckets[i].count).to.equal(0);
                            checkDate.subtract(1, "days");
                        }
                    });
                });

                it("Fills in gaps on ends when summary is provided.", function () {
                    const summary: TimeSummary = dummySummary(2, true);
                    const firstDate: moment.Moment = moment(summary.buckets[0].date).subtract(1, "days");
                    const lastDate: moment.Moment = moment(summary.buckets[summary.buckets.length - 1].date).add(1, "days");
                    const dateRange = { start_time: firstDate, end_time: lastDate };

                    const checkDate = moment(firstDate);

                    return fillGaps(summary, dateRange, "day").then(function (newSummary: TimeSummary) {
                        expect(newSummary.buckets).to.have.length(4); // 2 days plus caps

                        const max = newSummary.buckets.length;
                        const maxMinusOne = max - 1;
                        for (let i = 0; i < max; ++i) {
                            expect(newSummary.buckets[i].date).to.equalDate(checkDate.toDate());
                            if (i > 0 && i < maxMinusOne) {
                                expect(newSummary.buckets[i].count).to.equal(100);
                            } else {
                                expect(newSummary.buckets[i].count).to.equal(0);
                            }
                            checkDate.add(1, "days");
                        }
                    });
                });
            });
        });
    });

    describe("Unsuccessful queries.", function () {
        before(function () {
            logAggregate = Sinon.stub(Log, "aggregate").returns(Promise.reject(new Error("Errror thrown per requirement of the test.")));
        });

        beforeEach(function () {
            logAggregate.reset();
        });

        after(function () {
            logAggregate.restore();
        });

        it("Tests that an error code is sent on failure", function () {
            return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                expect(summary).to.exist;
                expect(summary.buckets).to.have.length(0);
                expect(statusStub).to.have.been.calledWithExactly(400);
                expect(sendStub).to.have.been.calledOnce;
                expect(jsonStub).to.not.have.been.called;
            });
        });
    });
});

interface Aggregate {
    _id: {
        month: number,
        day: number,
        year: number
    };
    transactions: string[];
}

function dummyAggregates(num: number): Aggregate[] {
    let aggs: Aggregate[] = [];
    for (let i = 0; i < num; i++) {
        aggs.push({
            _id: {
                month: i,
                day: i + 1,
                year: i + 2000
            },
            transactions: createGuuids(num)
        });
    }
    return aggs;
}

function dummySummary(num: number, increasing: boolean, gapsBetweenDays: number = 1): TimeSummary {
    const summary: TimeSummary = {
        buckets: []
    };

    const date: moment.Moment = moment([2017, 0, 15]);
    for (let i = 0; i < num; ++i) {
        summary.buckets.push({
            date: date.toDate(),
            count: 100
        });
        if (increasing) {
            date.add(gapsBetweenDays, "days");
        } else {
            date.subtract(gapsBetweenDays, "days");
        }
    }
    return summary;
}

function createGuuids(num: number): string[] {
    let guids: string[] = [];
    for (let i = 0; i < num; ++i) {
        guids.push(guid());
    }
    return guids;
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + "-" + s4() + "-" + s4() + "-" +
        s4() + "-" + s4() + s4() + s4();
}