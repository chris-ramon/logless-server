import * as chai from "chai";
// import * as mocha from "mocha";

import { Request } from "express";

import * as Utils from "../../controllers/query-utils";


const expect = chai.expect;

describe("QueryUtils", function() {

    describe("getDateRange", function() {
        it ("Tests the query is updated when no timestamp is provided and start_time is needed.", function() {
            const now = new Date();
            const reqQuery: any = { start_time: now };

            const req: Request = <Request> {};
            req.query = reqQuery;

            const testQuery: any = {};

            Utils.getDateRange(req, testQuery);

            expect(testQuery.timestamp).to.exist;

            const rangeObj = testQuery.timestamp;

            expect(rangeObj.$gte).to.equalDate(now);
        });

        it ("Tests the query is updated when no timestamp is provided and end_time is needed.", function() {
            const now = new Date();
            const reqQuery: any = { end_time: now };

            const req: Request = <Request> {};
            req.query = reqQuery;

            const testQuery: any = {};

            Utils.getDateRange(req, testQuery);

            expect(testQuery.timestamp).to.exist;

            const rangeObj = testQuery.timestamp;

            expect(rangeObj.$lte).to.equalDate(now);
        });

        it ("Tests the query is updated when a timestamp is provided and start_time and end_time is needed.", function() {
            const now = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const reqQuery: any = { start_time: yesterday, end_time: now };

            const req: Request = <Request> {};
            req.query = reqQuery;

            const testQuery: any = {timestamp: { parameter: 5 }};

            Utils.getDateRange(req, testQuery);

            expect(testQuery.timestamp).to.exist;

            const rangeObj = testQuery.timestamp;

            expect(rangeObj.$gte).to.equalDate(yesterday);
            expect(rangeObj.$lte).to.equalDate(now);
            expect(rangeObj.parameter).to.equal(5);
        });
    });
});