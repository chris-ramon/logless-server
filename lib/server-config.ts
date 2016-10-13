import {mongo} from "mongoose";
/**
 * Created by bvizy on 10/12/16.
 */

let PropertiesReader = require("properties-reader");

export class ServerConfig {
    public server_port: string;
    public mongo_url: string;
    public swagger_url: string;

    public static create(): ServerConfig {
        let instance:ServerConfig = new ServerConfig();
        instance.initialize();

        return instance;
    }

    public initialize():void {
        let props:any = null;

        try {
            props = PropertiesReader("./config.properties");
        } catch (err) {
            throw err;
        }

        let env = process.env.env || "default";

        this.server_port = props.get(env+".server_port" ) || props.get("default.server_port" );
        this.swagger_url = props.get(env+".swagger_url" ) || props.get("default.swagger_url" );

        this.mongo_url = process.env.BST_MONGO_URL || props.get(env+".mongo_url" ) || props.get("default.mongo_url" );

        if (!this.mongo_url) {
            console.error("Mongo db url is not set. Use the BST_MONGO_URL shell environment variable!");
            process.exit(1);
        }

        console.log("Server environment: "+env);
        console.log("Port: "+this.server_port);
        console.log("Mongo Url: "+this.mongo_url);
        console.log("Swagger Url: "+this.swagger_url);
    }
}