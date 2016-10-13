import * as express from "express";
import * as bodyParser from "body-parser";
import Collections = require("typescript-collections");
import * as Log from "../lib/log";
import {NameGen} from "../lib/name-generator";
import {ServerConfig} from "../lib/server-config";
import async = require("async");

let mongoose = require("mongoose");

let serverConfig = ServerConfig.create();

let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// Swagger is the only static for now
app.use(express.static("public"));

/**
 * Swagger setup
 */

let swaggerJSDoc = require("swagger-jsdoc");

let swaggerDefinition = {
    info: {
        title: "BST Logging Services Swagger API",
        version: "1.0.0",
        description: "RESTful API to store and retrieve logs",
    },
    host: serverConfig.swagger_url,
    basePath: "/v1",
};

// options for the swagger docs

let options = {
    // import swaggerDefinitions
    swaggerDefinition: swaggerDefinition,

    // path to the API docs
    apis: ["./bin/*.js"],
};

// initialize swagger-jsdoc

let swaggerSpec = swaggerJSDoc(options);

// Connect to mongo

mongoose.connect(serverConfig.mongo_url);

// serve swagger

app.get("/v1/swagger.json", function(req, res) {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

/**
 * Name store stuff
 */

let usedNames = new Collections.Set<string>();

let checker = function (name): boolean {
    if (usedNames.contains(name)) {
        return true;
    } else {
        usedNames.add(name);
        return false;
    }
};

const nameError = {
    message: "Name generation failed", name: "NameError", errors: {}
};

/**
 * @swagger
 * definition:
 *   Error:
 *     properties:
 *       message:
 *         type: string
 *       name:
 *         type: string
 *       errors:
 *         type: array
 *         items:
 *           type: string
 */

/**
 * @swagger
 * definition:
 *   Log:
 *     properties:
 *       payload:
 *         type: string
 *       transaction_id:
 *         type: string
 *       tags:
 *         type: array
 *         items:
 *           type: string
 *       timestamp:
 *         type: string
 *       log_type:
 *         type: string
 *       id:
 *         type: string
 */

 /**
 * @swagger
 * definition:
 *   LogList:
 *     properties:
 *       data:
 *         type: array
 *         items:
 *           "#/definitions/Log"
 */

 /**
 * @swagger
 * definition:
 *   Source:
 *     properties:
 *       source:
 *         type: string
 */

/**
 * @swagger
 * definition:
 *   Info:
 *     properties:
 *       info:
 *         type: string
 */

/**
 * @swagger
 * /source:
 *   get:
 *     tags:
 *       - Source
 *     description: Returns a generated logging source name
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Successful name generation
 *         schema:
 *           $ref: "#/definitions/Source"
 *       400:
 *         description: Error message
 *         schema:
 *           $ref: "#/definitions/Error"
 */

app.get("/v1/source", function (req, res) {
    let newName = NameGen.getName(checker);

    if (!newName) {
        res.json({info: "No more names", error: nameError});
    } else {
        res.json({source: newName});
    }
});

/**
 * @swagger
 * /receive:
 *   post:
 *     tags:
 *       - Save a batch of logs
 *     description: Saves a batch of log entries
 *     produces:
 *       - application/json
 *     consumes:
 *       - application/json
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           $ref: Log
 *     responses:
 *       200:
 *         description: Log entries were saved
 *         schema:
 *           $ref: "#/definitions/Info"
 *       400:
 *         description: Error message
 *         schema:
 *           $ref: "#/definitions/Error"
 */

app.post("/v1/receive", function (req, res) {
    let batch = req.body;
    let logs: any[] = [];

    for (let log of batch.logs) {
        log["source"] = batch.source;
        log["transaction_id"] = batch.transaction_id;
        logs.push(log);
    }

    async.mapLimit(logs, 10, function(l1, callback) {
        let newLog = new Log(l1);
        newLog.save((err) => {
            if (err)
                return callback(err, l1);

            callback(null, l1);
        })
    }, function(err, results) {
        if (err) {
            res.json({info: "Error during log entry create", error: err});
        } else {
            res.json({info: results.length + " inserted"});
        }
    });
});

/**
 * @swagger
 * /query:
 *   get:
 *     tags:
 *       - Query
 *     description: Queries the log db
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: source
 *         in: query
 *         description: Log source id
 *         required: true
 *         type: string
 *       - name: start_time
 *         in: query
 *         description: Log source id
 *         required: true
 *         type: string
 *       - name: end_time
 *         in: query
 *         description: Log source id
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: Log entry was saved
 *         schema:
 *           $ref: "#/definitions/LogList"
 *       400:
 *         description: Error message
 *         schema:
 *           $ref: "#/definitions/Error"
 */

app.get("/v1/query", function (req, res) {
    let query = {
        source: req.query.source,
        timestamp: {}
    };

    if (req.query.end_time) {
        query.timestamp = {$gt: req.query.start_time, $lt: req.query.end_time};
    } else {
        query.timestamp = {$gt: req.query.start_time};
    }

    Log.find(query, function (err, logs) {
        if (err) {
            res.json({info: "Error during finding logs", error: err});
        } else {
            if (logs) {
                res.json({data: logs});
            } else {
                res.json({info: "Logs not found"});
            }
        }
    });
    //  .limit(100)
});

/* Read all */
app.get("/v1/log", function (req, res) {
    Log.find((err, logs) => {
        if (err) {
            res.json({info: "Error during finding logs", error: err});
        } else {
            res.json({data: logs});
        }
    });
});

let _server = app.listen(parseInt(serverConfig.server_port), function () {
    console.log("The BST logger server listening on port "+serverConfig.server_port);
});
