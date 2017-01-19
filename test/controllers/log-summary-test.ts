import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";

import { Request, Response } from "express";

import Log, { ILog } from "../../lib/log";
import { TimeSummary } from "../../lib/time-bucket";


import * as Utils from "../utils";

import logSummary from "../../controllers/log-summary";


Chai.use(SinonChai);
const expect = Chai.expect;

const NUM_OF_LOGS = 6;

describe("Log time summary", function () {

    let logFind: Sinon.SinonStub;
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
            let dummyLogs: ILog[] = Utils.dummyLogs(NUM_OF_LOGS, (i: number) => {
                return today;
            });
            logFind = Sinon.stub(Log, "find").returns(Promise.resolve(dummyLogs));
        });

        beforeEach(function () {
            logFind.reset();
        });

        after(function () {
            logFind.restore();
        });

        it("Tests the basic query.", function () {
            const startOfToday = new Date(today.toISOString());
            startOfToday.setHours(0, 0, 0, 0);

            return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                expect(logFind).to.have.been.calledOnce;
                expect(logFind).to.have.been.calledWith({}, undefined, undefined);

                expect(summary).to.exist;
                expect(summary.buckets).to.have.length(1);

                expect(statusStub).to.be.calledWithExactly(200);

                expect(jsonStub).to.have.been.calledOnce;
                expect(jsonStub).to.have.been.calledWithExactly({
                    buckets: [{
                        date: startOfToday,
                        count: NUM_OF_LOGS
                    }]
                });
            });
        });

        describe("Tests the queries are properly set.", function () {
            it("Tests the source query", function () {
                mockRequest.query = { source: "ABC123" };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    expect(logFind).to.be.calledWith({ source: "ABC123" });
                });
            });

            it("Tests the start time query", function () {
                mockRequest.query = { start_time: today };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    expect(logFind).to.be.calledWith({ timestamp: { $gte: today } }, undefined, undefined);
                });
            });

            it("Tests the end time query", function () {
                mockRequest.query = { end_time: today };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    expect(logFind).to.be.calledWith({ timestamp: { $lte: today } }, undefined, undefined);
                });
            });

            it("Tests the sort query with ascending", function () {
                mockRequest.query = { date_sort: "asc" };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    expect(logFind).to.be.calledWith({}, undefined, { sort: { timestamp: 1 } });
                });
            });

            it("Tests the sort query descending", function () {
                mockRequest.query = { date_sort: "desc" };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    expect(logFind).to.be.calledWith({}, undefined, { sort: { timestamp: -1 } });
                });
            });

            it("Tests the sort query is ignored with invalid entry.", function () {
                mockRequest.query = { date_sort: "noop" };

                return logSummary(mockRequest, mockResponse).then(function (summary: TimeSummary) {
                    expect(logFind).to.be.calledWithExactly({}, undefined, undefined);
                });
            });
        });
    });

    describe("Unsuccessful queries.", function () {
        before(function () {
            logFind = Sinon.stub(Log, "find").returns(Promise.reject(new Error("Errror thrown per requirement of the test.")));
        });

        beforeEach(function() {
            logFind.reset();
        });

        after(function() {
            logFind.restore();
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