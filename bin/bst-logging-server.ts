import * as express from "express";
import * as bodyParser from "body-parser";
import Collections = require("typescript-collections");
import * as Log from "../lib/log";
import {NameGen} from "../lib/name-generator";
import {ServerConfig} from "../lib/server-config";
import async = require("async");

let serverConfig = ServerConfig.create();
let configError = serverConfig.initialize("./config.properties");
if (configError) {
    console.error("Configurator ha a problem: " + configError.message);
    process.exit(2);
}

let mongoose = require("mongoose");
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
 *   Log:
 *     properties:
 *       payload:
 *         type: string
 *       tags:
 *         type: array
 *         items:
 *           type: string
 *       timestamp:
 *         type: string
 *       log_type:
 *         type: string
 */

/**
 * @swagger
 * definition:
 *   Logs:
 *     properties:
 *       source:
 *         type: string
 *       transaction_id:
 *         type: string
 *       logs:
 *         type: array
 *         items:
 *           '#/definitions/Log'
 */

/**
 * @swagger
 * definition:
 *   LogResult:
 *     properties:
 *       payload:
 *         type: string
 *       source:
 *         type: string
 *       tags:
 *         type: array
 *         items:
 *           type: string
 *       transaction_id:
 *         type: string
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
 *           '#/definitions/LogResult'
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
 *       - Logs
 *     description: Creates new log entries
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: logs
 *         description: Log list
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/Logs'
 *     responses:
 *       200:
 *         description: Successfully created
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
        });
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
 *         description: The start period to get logs from (ISO format)
 *         required: true
 *         type: string
 *       - name: end_time
 *         in: query
 *         description: The end period to get logs from (ISO format)
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         schema:
 *           title: ArrayOfLogs
 *           type: object
 *           properties:
 *             logs:
 *               type: array
 *               items:
 *                 title: Log
 *                 type: object
 *                 properties:
 *                   payload:
 *                     type: string
 *                   source:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                   transaction_id:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                   log_type:
 *                     type: string
 *                   id:
 *                     type: string
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

    Log.find(query, null, {sort: {timestamp: -1}}, (err, logs) => {
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

    // For pagination later ...
    //  .skip(0)
    //  .limit(100)
});

/* Read all */
app.get("/v1/log", function (req, res) {
    Log.find({}, null, {sort: {timestamp: -1}}, (err, logs) => {
        if (err) {
            res.json({info: "Error during finding logs", error: err});
        } else {
            res.json({data: logs});
        }
    });
});

let _server = app.listen(parseInt(serverConfig.server_port), function () {
    console.log("The BST logger server listening on port " + serverConfig.server_port);
});
