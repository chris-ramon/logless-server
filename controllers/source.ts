/**
 * Created by bvizy on 10/26/16.
 */

import {NameGen} from "../lib/name-generator";
import Collections = require("typescript-collections");

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

export default function (req, res) {
    let newName = NameGen.getName(checker);

    if (!newName) {
        res.json({info: "No more names", error: nameError});
    } else {
        res.json({source: newName});
    }
};

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

