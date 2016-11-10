import * as express from "express";
import * as bodyParser from "body-parser";
import {ServerConfig} from "../lib/server-config";
import receive from "../controllers/receive";
import query from "../controllers/query";
import source from "../controllers/source";
import allLogs from "../controllers/all-logs";

let mongoose = require("mongoose");

/**
 * Server setup
 */

let serverConfig = ServerConfig.create();
let configError = serverConfig.initialize("./config.properties");
if (configError) {
    console.error("Configurator ha a problem: " + configError.message);
    process.exit(2);
}

let app = express();

// JSON Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// Swagger is the only static for now
app.use(express.static("public"));

// CORS Headers
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

/**
 * Swagger setup
 */

let swaggerJSDoc = require("swagger-jsdoc");

let swaggerDefinition = {
    info: {
        title: "BST Logless Server Swagger API",
        version: "1.0.0",
        description: "RESTful API to store and retrieve logs",
    },
    host: serverConfig.swagger_url,
    basePath: "/v1"
};

let options = {
    // import swaggerDefinitions
    swaggerDefinition: swaggerDefinition,

    // path to the API docs
    apis: ["./controllers/*.js"],
};

let swaggerSpec = swaggerJSDoc(options);

/**
 * Connect Mongoos
 */

mongoose.connect(serverConfig.mongo_url);

/**
 * Routes
 */

/* Swagger */
app.get("/v1/swagger.json", function(req, res) {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

/* Receive */
app.post("/v1/receive", receive);

/* Query */
app.get("/v1/query", query);

/* Source */
app.get("/v1/source", source);

/* All */
app.get("/v1/log", allLogs);

/**
 * Fire up the server
 */

let _server = app.listen(parseInt(serverConfig.server_port), function () {
    console.log("The BST logger server listening on port " + serverConfig.server_port);
});
