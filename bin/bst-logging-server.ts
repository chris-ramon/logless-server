import * as express from "express";
import * as bodyParser from "body-parser";
import Collections = require("typescript-collections");

import * as Log from "../lib/log";
import {NameGen} from "../lib/name-generator";
import {isUndefined} from "typescript-collections/dist/lib/util";

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
    host: "localhost:3000",
    basePath: "/api",
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

let mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/loggerdb");

// serve swagger

app.get("/api/swagger.json", function(req, res) {
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
 *         type: [string]
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
 * /source:
 *   get:
 *     tags:
 *       - Logging source
 *     description: Returns a generated logging source name
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: An array of puppies
 *         schema:
 *           $ref: "#/definitions/Source"
 *       400:
 *         description: Error message
 *         schema:
 *           $ref: "#/definitions/Error"
 */

app.get("/api/source", function (req, res) {
    let newName = NameGen.getName(checker);

    if (!newName) {
        res.json({info: "No more names", error: nameError});
    } else {
        res.json({source: newName});
    }
});


/* Create */
app.post("/api/receive", function (req, res) {
    let newLog = new Log(req.body);
    newLog.save((err) => {
        if (err) {
            res.json({info: "Error during log entry create", error: err});
        } else {
            res.json({data: newLog});
        }
    });
});

/* Query by source and time */
app.get("/api/query", function (req, res) {
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
app.get("/api/log", function (req, res) {
    Log.find((err, logs) => {
        if (err) {
            res.json({info: "Error during finding logs", error: err});
        } else {
            res.json({data: logs});
        }
    });
});

let _server = app.listen(3000, function () {
    console.log("The BST logger server listening on port 3000");
});
