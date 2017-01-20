import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";

import { Request, Response } from "express";

import Log from "../../lib/log";
import { TimeSummary } from "../../lib/time-bucket";

import logSummary from "../../controllers/log-summary";


Chai.use(SinonChai);
const expect = Chai.expect;

const NUM_OF_LOGS = 6;

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
            let dummyLogs: Aggregate[] = dummyAggregates(NUM_OF_LOGS);
            logAggregate = Sinon.stub(Log, "aggregate").returns(Promise.resolve(dummyLogs));
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
                expect(summary.buckets).to.have.length(NUM_OF_LOGS);

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