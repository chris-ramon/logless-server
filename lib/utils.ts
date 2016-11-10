/**
 * Created by bvizy on 10/12/16.
 */

let fs = require("fs");

export class Utils {
    public static version() {
        let json = JSON.parse(fs.readFileSync("package.json", "utf8"));
        return json.version;
    }
};
