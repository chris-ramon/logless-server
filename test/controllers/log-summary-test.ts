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

        let baseGroup: any;

        before(function () {
            let dummyAggs: Aggregate[] = dummyAggregates(NUM_OF_AGGS);
            logAggregate = Sinon.stub(Log, "aggregate").returns(Promise.resolve(dummyAggs));
            baseGroup = {
                $group: {
                    _id: {
                        month: { $month: "$timestamp" },
                        day: { $dayOfMonth: "$timestamp" },
                        year: { $year: "$timestamp" }
                    },
                    count: {
                        $sum: 1
                    }
                }
            };
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
                expect(logAggregate).to.have.been.calledOnce;
                expect(logAggregate).to.have.been.calledWith([{ $match: {} }, baseGroup]);

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
                    expect(logAggregate).to.be.calledWith([{ $match: { source: "ABC123" } }, baseGroup]);
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

            it("Tests the gaps are fill in between the two dates that are increasing.", function () {
                const startDate: moment.Moment = moment([2017, 0, 14]);
                const endDate: moment.Moment = moment([2017, 0, 15]);

                const buckets: TimeBucket[] = fillGap(startDate, endDate);

                console.log(buckets);
                expect(buckets).to.have.length(24); // It won't include the end.

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

                const buckets: TimeBucket[] = fillGap(startDate, endDate);

                console.log(buckets);
                expect(buckets).to.have.length(24); // It won't include the end.

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

                const buckets: TimeBucket[] = fillGap(startDate, endDate);

                expect(buckets).to.be.empty;
            });

            it ("Tests nothign is returned when the \"from\" parameter is undefined.", function() {
                const endDate: moment.Moment = moment([2017, 0, 15]);

                const buckets: TimeBucket[] = fillGap(undefined, endDate);

                expect(buckets).to.be.empty;
            });

            it ("Tests nothign is returned when the \"to\" parameter is undefined.", function() {
                const endDate: moment.Moment = moment([2017, 0, 15]);

                const buckets: TimeBucket[] = fillGap(endDate, undefined);

                expect(buckets).to.be.empty;
            });
        });

        describe("function \"fillGaps\"", function () {
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

            it ("Tests that no bucket is filled when there are no buckets in summary.", function() {
                const summary: TimeSummary = dummySummary(0, true);

                return fillGaps(summary).then(function (newSummary: TimeSummary) {
                    expect(newSummary.buckets).to.have.length(0);
                });
            });

            it ("Fills in gaps when a date range is provided.", function() {
                const summary: TimeSummary = dummySummary(0, true);
                const dateRange = { start_time: moment([2017, 0, 15]), end_time: moment([2017, 0, 16])};

                const checkDate = moment(dateRange.start_time);

                return fillGaps(summary, dateRange).then(function (newSummary: TimeSummary) {
                    console.log(newSummary);
                    expect(newSummary.buckets).to.have.length(25); // Should be 25 as in all day plus the ending hour.

                    for (let i = 0; i < newSummary.buckets.length; ++i) {
                        expect(newSummary.buckets[i].date).to.equalDate(checkDate.toDate());
                        expect(newSummary.buckets[i].count).to.equal(0);
                        checkDate.add(1, "hour");
                    }
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
    count: number;
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
            count: i
        });
    }
    return aggs;
}

function dummySummary(num: number, increasing: boolean): TimeSummary {
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
            date.add(1, "days");
        } else {
            date.subtract(1, "days");
        }
    }
    return summary;
}