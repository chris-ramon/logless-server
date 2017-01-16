/**
 * Created by bvizy on 10/12/16.
 */

let PropertiesReader = require("properties-reader");

export class ServerConfig {
    public static server_port: string;
    public static mongo_url: string;
    public static swagger_url: string;
    public static debug_mode: boolean;

    public static initialize(configFile: string): Error {
        let props: any = null;

        try {
            props = PropertiesReader(configFile);
        } catch (err) {
            return new Error("Config file not found: " + configFile);
        }

        let env = process.argv[2] || process.env.env || "default";

        ServerConfig.server_port = props.get(env + ".server_port") || props.get("default.server_port");
        ServerConfig.swagger_url = props.get(env + ".swagger_url") || props.get("default.swagger_url");
        ServerConfig.debug_mode = props.get(env + ".debug_mode") || true;

        ServerConfig.mongo_url = process.env.BST_MONGO_URL || props.get(env + ".mongo_url") || props.get("default.mongo_url");

        if (!ServerConfig.mongo_url) {
            return new Error("Mongo db url is not set. Use the BST_MONGO_URL shell environment variable!");
        }

        console.log("Server environment: " + env);
        console.log("Port: " + ServerConfig.server_port);
        console.log("Mongo Url: " + ServerConfig.mongo_url);
        console.log("Swagger Url: " + ServerConfig.swagger_url);
        console.log("Debug mode: " + ServerConfig.debug_mode);

        return null;
    }
}

export default ServerConfig;