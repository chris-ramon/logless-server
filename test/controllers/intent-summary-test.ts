import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";

import { Request, Response } from "express";

import Log from "../../lib/log";

import intentSummary from "../../controllers/intent-summary";
import { CountResult } from "../../lib/counter";

Chai.use(SinonChai);
const expect = Chai.expect;

const NUM_OF_AGGS = 6;

describe("Intent count summary", function () {

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
        let dummyAggs: Aggregate[];

        before(function () {
            dummyAggs = dummyAggregates(NUM_OF_AGGS);
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

            return intentSummary(mockRequest, mockResponse)
            .then(function (result: CountResult) {
                expect(logAggregate).to.have.been.calledOnce;

                expect(result).to.not.be.undefined;
                expect(result.count).to.have.length(NUM_OF_AGGS);

                expect(statusStub).to.be.calledWithExactly(200);

                expect(jsonStub).to.have.been.calledOnce;
                expect(jsonStub).to.have.been.calledWithExactly(result);
            });
        });

        describe("Tests the queries are properly set.", function () {
            it("Tests the source query", function () {
                mockRequest.query = { source: "ABC123" };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                    expect(logAggregate).to.be.calledOnce;
                });
            });

            it("Tests the start time query", function () {
                mockRequest.query = { start_time: today.toISOString() };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                    const firstCallArgs = logAggregate.args[0][0];
                    const matchArgs = firstCallArgs[0]["$match"];
                    const timestamp = matchArgs.timestamp;

                    expect(timestamp).to.have.key("$gte");
                    expect(timestamp["$gte"]).to.equalDate(today);
                });
            });

            it("Tests the end time query", function () {
                mockRequest.query = { end_time: today.toISOString() };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                    const firstCallArgs = logAggregate.args[0][0];
                    const matchArgs = firstCallArgs[0]["$match"];
                    const timestamp = matchArgs.timestamp;

                    expect(timestamp).to.have.key("$lte");
                    expect(timestamp["$lte"]).to.equalDate(today);
                });
            });

            it("Tests the sort query with ascending", function () {
                mockRequest.query = { count_sort: "asc" };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                    const firstCallArgs = logAggregate.args[0][0];
                    const sortArgs = firstCallArgs[2]["$sort"];
                    expect(sortArgs).to.exist;
                    expect(sortArgs).to.deep.equal({ count: 1 });
                });
            });

            it("Tests the sort query descending", function () {
                mockRequest.query = { count_sort: "desc" };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                    const firstCallArgs = logAggregate.args[0][0];
                    const sortArgs = firstCallArgs[2]["$sort"];
                    expect(sortArgs).to.exist;
                    expect(sortArgs).to.deep.equal({ count: -1 });
                });
            });

            it("Tests the sort query is ignored with invalid entry.", function () {
                mockRequest.query = { count_sort: "noop" };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
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
            return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                expect(result).to.exist;
                expect(result.count).to.have.length(0);
                expect(statusStub).to.have.been.calledWithExactly(400);
                expect(sendStub).to.have.been.calledOnce;
                expect(jsonStub).to.not.have.been.called;
            });
        });
    });
});

interface Aggregate {
    _id: string;
    origin: string;
    count: number;
}

function dummyAggregates(num: number): Aggregate[] {
    let aggs: Aggregate[] = [];
    for (let i = 0; i < num; ++i) {
        aggs.push({
            _id: "aggragte" + i,
            origin: "IntentRequest",
            count: i
        });
    }
    return aggs;
}