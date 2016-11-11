/// <reference path="../typings/index.d.ts" />

import {ServerConfig} from "../lib/server-config";
import * as assert from "assert";

describe("ServerConfig", function () {
    beforeEach(function () {
    });

    afterEach(function () {
    });

    it("screams for missing config file", function () {
        let error = ServerConfig.initialize("./foo3456.properties");
        if (error) {
            console.log("Error: " + error.message);
        }

        assert.ok(error, "Did not signal missing config file");
    });

    it("processes config file", function () {
        process.env.BST_MONGO_URL = "foo";

        let error = ServerConfig.initialize("./config.properties");
        if (error) {
            console.log("Error: " + error.message);
        }

        assert.ok(ServerConfig.server_port, "Port is missing!");
        assert.ok(ServerConfig.mongo_url === "foo", "Mongo url is missing!");
    });

    it("screams for missing mongo url", function () {
        process.env.BST_MONGO_URL = "";

        let error = ServerConfig.initialize("./config.properties");
        if (error) {
            console.log("Error: " + error.message);
        }

        assert.ok(error, "Did not signal missing mongo url");
    });
});