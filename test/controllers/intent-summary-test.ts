import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";

import { Request, Response } from "express";

import Log, { ILog } from "../../lib/log";

import * as Utils from "../utils";

import intentSummary from "../../controllers/intent-summary";
import { CountResult } from "../../lib/counter";

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
        let dummyLogs: ILog[];

        before(function () {
            dummyLogs = Utils.dummyRequests(NUM_OF_LOGS, "INFO", (i: number) => {
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

            return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                expect(logFind).to.have.been.calledOnce;
                expect(logFind).to.have.been.calledWith({ "payload.request": { $exists: true } });

                expect(result).to.not.be.undefined;
                expect(result.count).to.have.length(1);

                expect(statusStub).to.be.calledWithExactly(200);

                console.log(result);
                expect(jsonStub).to.have.been.calledOnce;
                expect(jsonStub).to.have.been.calledWithExactly(result);
            });
        });

        describe("Tests the queries are properly set.", function () {
            it("Tests the source query", function () {
                mockRequest.query = { source: "ABC123" };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                    expect(logFind).to.be.calledWith({ "payload.request": { $exists: true }, source: "ABC123" });
                });
            });

            it("Tests the start time query", function () {
                mockRequest.query = { start_time: today };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                    expect(logFind).to.be.calledWith({ "payload.request": { $exists: true }, timestamp: { $gte: today } });
                });
            });

            it("Tests the end time query", function () {
                mockRequest.query = { end_time: today };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                    expect(logFind).to.be.calledWith({ "payload.request": { $exists: true }, timestamp: { $lte: today } });
                });
            });

            describe("Sorting", function () {
                let oldLogs: ILog[];

                before(function () {
                    oldLogs = dummyLogs;

                    let dateGetter = function (index: number): Date {
                        return today;
                    };
                    dummyLogs = Utils.dummyRequests(6, "INFO", dateGetter);
                    dummyLogs = dummyLogs.concat(Utils.dummyRequests(1, "DEBUG", dateGetter));
                    dummyLogs = dummyLogs.concat(Utils.dummyRequests(8, "ERROR", dateGetter));
                    dummyLogs = dummyLogs.concat(Utils.dummyRequests(3, "VERBOSE", dateGetter));
                    dummyLogs = dummyLogs.concat(Utils.dummyRequests(7, "WARNING", dateGetter));
                    dummyLogs = dummyLogs.concat(Utils.dummyRequests(4, "CRASH", dateGetter));
                    dummyLogs = dummyLogs.concat(Utils.dummyRequests(2, "LOG", dateGetter));

                    logFind.restore();
                    logFind = Sinon.stub(Log, "find").returns(Promise.resolve(dummyLogs));
                });

                after(function () {
                    dummyLogs = oldLogs;
                    logFind.restore();
                });

                it("Tests the sort query with ascending", function () {
                    mockRequest.query = { count_sort: "asc" };

                    return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                        // Check that all the counts are in order from least to greatest.
                        console.log(result);
                        const count = result.count;
                        expect(count[0].count).to.equal(1);
                        expect(count[0].name).to.equal("DEBUG");

                        expect(count[1].count).to.equal(2);
                        expect(count[1].name).to.equal("LOG");

                        expect(count[2].count).to.equal(3);
                        expect(count[2].name).to.equal("VERBOSE");

                        expect(count[3].count).to.equal(4);
                        expect(count[3].name).to.equal("CRASH");

                        expect(count[4].count).to.equal(6);
                        expect(count[4].name).to.equal("INFO");

                        expect(count[5].count).to.equal(7);
                        expect(count[5].name).to.equal("WARNING");

                        expect(count[6].count).to.equal(8);
                        expect(count[6].name).to.equal("ERROR");
                    });
                });

                it("Tests the sort query descending", function () {
                    mockRequest.query = { count_sort: "desc" };

                    return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                        // Check that all the counts are in order from least to greatest.
                        const count = result.count;

                        expect(count[0].count).to.equal(8);
                        expect(count[0].name).to.equal("ERROR");

                        expect(count[1].count).to.equal(7);
                        expect(count[1].name).to.equal("WARNING");

                        expect(count[2].count).to.equal(6);
                        expect(count[2].name).to.equal("INFO");

                        expect(count[3].count).to.equal(4);
                        expect(count[3].name).to.equal("CRASH");

                        expect(count[4].count).to.equal(3);
                        expect(count[4].name).to.equal("VERBOSE");

                        expect(count[5].count).to.equal(2);
                        expect(count[5].name).to.equal("LOG");

                        expect(count[6].count).to.equal(1);
                        expect(count[6].name).to.equal("DEBUG");
                    });
                });

                it("Tests the sort query is ignored with invalid entry.", function () {
                    mockRequest.query = { count_sort: "noop" };

                    return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                        // Check that all the counts are in order from least to greatest.
                        const count = result.count;

                        expect(count[0].count).to.equal(6);
                        expect(count[0].name).to.equal("INFO");

                        expect(count[1].count).to.equal(1);
                        expect(count[1].name).to.equal("DEBUG");

                        expect(count[2].count).to.equal(8);
                        expect(count[2].name).to.equal("ERROR");

                        expect(count[3].count).to.equal(3);
                        expect(count[3].name).to.equal("VERBOSE");

                        expect(count[4].count).to.equal(7);
                        expect(count[4].name).to.equal("WARNING");

                        expect(count[5].count).to.equal(4);
                        expect(count[5].name).to.equal("CRASH");

                        expect(count[6].count).to.equal(2);
                        expect(count[6].name).to.equal("LOG");
                    });
                });
            });
        });
    });

    describe("Unsuccessful queries.", function () {
        before(function () {
            logFind = Sinon.stub(Log, "find").returns(Promise.reject(new Error("Errror thrown per requirement of the test.")));
        });

        beforeEach(function () {
            logFind.reset();
        });

        after(function () {
            logFind.restore();
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