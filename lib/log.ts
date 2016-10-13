/**
 * Created by bvizy on 10/11/16.
 */

import * as mongoose from "mongoose";

enum LogType {VERBOSE, DEBUG, INFO, WARN, ERROR};

interface ILog {
    source: string;
    transaction_id: string;
    payload: string;
    tags: string[];
    timestamp: Date;
    log_type: LogType;
}

interface ILogModel extends ILog, mongoose.Document {
    // More here ...
};

let logSchema = new mongoose.Schema({
    source: {
        type: String,
        required: [true, "Source is missing"]
    },
    transaction_id: {
        type: String,
        required: [true, "Transaction ID is missing"]
    },

    payload: {
        type: String,
        required: [true, "Payload is missing"]
    },
    tags: [String],
    timestamp: {type: Date, default: Date.now},
    log_type: {
        type: String,
        enum: ["VERBOSE", "DEBUG", "INFO", "WARN", "ERROR"],
        required: [true, "Log type is missing"]
    }
});

logSchema.set("toJSON", {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

let Log = mongoose.model("Log", logSchema);

export = Log;
