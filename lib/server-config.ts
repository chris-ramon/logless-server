/**
 * Created by bvizy on 10/12/16.
 */

let PropertiesReader = require("properties-reader");

export class ServerConfig {
    public server_port: string;
    public mongo_url: string;
    public swagger_url: string;

    public static create(): ServerConfig {
        let instance: ServerConfig = new ServerConfig();
        return instance;
    }

    public initialize(configFile: string): Error {
        let props: any = null;

        try {
            props = PropertiesReader(configFile);
        } catch (err) {
            return new Error("Config file not found: " + configFile);
        }

        let env = process.argv[2] || process.env.env || "default";

        this.server_port = props.get(env + ".server_port") || props.get("default.server_port");
        this.swagger_url = props.get(env + ".swagger_url") || props.get("default.swagger_url");

        this.mongo_url = process.env.BST_MONGO_URL || props.get(env + ".mongo_url") || props.get("default.mongo_url");

        if (!this.mongo_url) {
            return new Error("Mongo db url is not set. Use the BST_MONGO_URL shell environment variable!");
        }

        console.log("Server environment: " + env);
        console.log("Port: " + this.server_port);
        console.log("Mongo Url: " + this.mongo_url);
        console.log("Swagger Url: " + this.swagger_url);

        return null;
    }
}