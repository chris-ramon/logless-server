import { ServerConfig } from "../lib/server-config";

export namespace Console {
    export function info(message: string, ...optionalParams: any[]) {
        if (ServerConfig.debug_mode) {
            console.info(message, optionalParams);
        }
    }

    export function log(obj: any, ...optionalParams: any[]) {
        if (ServerConfig.debug_mode) {
            console.log(obj, optionalParams);
        }
    }

    export function error(message?: string, ...optionalParams: any[]): void {
        if (ServerConfig.debug_mode) {
            console.error(message, optionalParams)
        }
    }
}

export default Console;
