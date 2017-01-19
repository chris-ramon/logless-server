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

        before(function () {
            let dummyLogs: ILog[] = Utils.dummyRequests(NUM_OF_LOGS, (i: number) => {
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
                expect(logFind).to.have.been.calledWith({ "payload.request": { $exists: true }});

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

            xit("Tests the sort query with ascending", function () {
                mockRequest.query = { date_sort: "asc" };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                    expect(logFind).to.be.calledWith({}, undefined, { sort: { timestamp: 1 } });
                });
            });

            xit("Tests the sort query descending", function () {
                mockRequest.query = { date_sort: "desc" };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
                    expect(logFind).to.be.calledWith({}, undefined, { sort: { timestamp: -1 } });
                });
            });

            xit("Tests the sort query is ignored with invalid entry.", function () {
                mockRequest.query = { date_sort: "noop" };

                return intentSummary(mockRequest, mockResponse).then(function (result: CountResult) {
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

        it ("Tests that an error code is sent on failure", function() {
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