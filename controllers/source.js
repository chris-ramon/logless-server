/**
 * Created by bvizy on 10/26/16.
 */
"use strict";
var name_generator_1 = require("../lib/name-generator");
var Collections = require("typescript-collections");
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
function default_1(req, res) {
    var newName = name_generator_1.NameGen.getName(checker);
    if (!newName) {
        res.json({ info: "No more names", error: nameError });
    }
    else {
        res.json({ source: newName });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
;
/**
 * Name store stuff
 */
var usedNames = new Collections.Set();
var checker = function (name) {
    if (usedNames.contains(name)) {
        return true;
    }
    else {
        usedNames.add(name);
        return false;
    }
};
var nameError = {
    message: "Name generation failed", name: "NameError", errors: {}
};
//# sourceMappingURL=source.js.map