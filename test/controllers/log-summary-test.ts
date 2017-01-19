import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";

import { Request, Response } from "express";

import Log, { ILog } from "../../lib/log";

import * as Utils from "../utils";

import logSummary from "../../controllers/log-summary";

Chai.use(SinonChai);
const expect = Chai.expect;

const NUM_OF_LOGS = 6;

describe("Log time summary", function () {

    describe("Successfull queries to the database.", function () {
        let logFind: Sinon.SinonStub;
        let mockRequest: Request;
        let mockResponse: Response;

        let statusStub: Sinon.SinonStub;
        let jsonStub: Sinon.SinonStub;
        let sendStub: Sinon.SinonStub;

        let today: Date = new Date();

        before(function () {
            let dummyLogs: ILog[] = Utils.dummyLogs(NUM_OF_LOGS, (i: number) => {
                return today;
            });
            logFind = Sinon.stub(Log, "find").returns(Promise.resolve(dummyLogs));
        });

        beforeEach(function () {
            logFind.reset();
            mockRequest = <Request>{};
            mockRequest.query = {};

            mockResponse = <Response>{};
            mockResponse.status = statusStub = Sinon.stub().returnsThis();
            mockResponse.send = sendStub = Sinon.stub().returnsThis();
            mockResponse.json = jsonStub = Sinon.stub().returnsThis();
        });

        after(function () {
            logFind.restore();
        });

        it("Tests the basic query.", function () {
            const startOfToday = new Date(today.toISOString());
            startOfToday.setHours(0, 0, 0, 0);

            return logSummary(mockRequest, mockResponse).then(function (logs: ILog[]) {
                expect(logFind).to.have.been.calledOnce;
                expect(logFind).to.have.been.calledWith({}, undefined, undefined);

                expect(logs).to.have.length(NUM_OF_LOGS);

                expect(mockResponse.status).to.be.calledWithExactly(200);

                expect(jsonStub).to.have.been.calledOnce;
                expect(jsonStub).to.have.been.calledWithExactly({
                    buckets: [{
                        date: startOfToday,
                        count: 6
                    }]
                });
            });
        });
    });
});