import * as express from "express";
import * as bodyParser from "body-parser";
import Collections = require('typescript-collections');

import * as Log from "../lib/log"
import {NameGen} from "../lib/name-generator";

let app = express();
let mongoose = require('mongoose');
mongoose.connect("mongodb://localhost/loggerdb");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

let usedNames = new Collections.Set<string>();

let checker = function (name) : boolean {
    if (usedNames.contains(name)) {
        return true;
    } else {
        usedNames.add(name);
        return false;
    }
}

let nameError = {
    message: "Name generation failed", name: "NameError", errors: {}
};

/* Source name generator */
app.get('/api/source', function (req, res) {
    let newName = NameGen.getName(checker);

    if (!newName) {
        res.json({info: 'No more names', error: nameError});
    } else {
        res.json({source: newName});
    }
});


/* Create */
app.post('/api/receive', function (req, res) {
    var newLog = new Log(req.body);
    newLog.save((err)=> {
        if (err) {
            res.json({info: 'Error during log entry create', error: err});
        } else {
            res.json({data: newLog});
        }
    });
});

/* Query by source*/
app.get('/api/query/source', function (req, res) {
    var query = {source: req.params.source};

    Log.find(query, function (err, logs) {
        if (err) {
            res.json({info: 'Error during finding logs', error: err});
        } else {
            if (logs) {
                res.json({data: logs});
            } else {
                res.json({info: 'Logs not found:' + req.params.source});
            }
        }
    });
});

/* Read all */
app.get('/api/log', function (req, res) {
    Log.find((err, logs) => {
        if (err) {
            res.json({info: 'Error during finding logs', error: err});
        } else {
            res.json({data: logs});
        }
    });
});

var server = app.listen(3000, function () {
    console.log('The BST logger server listening on port 3000');
});
