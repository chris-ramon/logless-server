
import { ILog, LogType } from "../lib/log";

export function dateGenerator(index): Date {
    return new Date();
}

export function dummyLogs(count: number, dateGetter: (index: number) => Date = dateGenerator): ILog[] {
    if (count % 2 !== 0) {
        throw new Error("Count for dummyLogs must be even for a good request/response parity. Dying for your own good.");
    }
    let iLogs: ILog[] = [];

    for (let i = 0; i < count; ++i) {
        const log: ILog = (i % 2) ? createRequestLog(dateGetter(i)) : createResponseLog(dateGetter(i));
        iLogs.push(log);
    }

    return iLogs;
}

export function createRequestLog(timestamp: Date): ILog {
    return {
        source: createUUID(),
        transaction_id: createUUID(),
        payload: requestPayload(),
        tags: ["request", "tag1", "tag2"],
        timestamp: new Date(),
        log_type: LogType.DEBUG
    };
}

export function createResponseLog(timestamp: Date): ILog {
    return {
        source: createUUID(),
        transaction_id: createUUID(),
        payload: responsePayload(),
        tags: ["response", "tag1", "tag2"],
        timestamp: new Date(),
        log_type: LogType.DEBUG
    };
}

export function requestPayload(): any {
    return {
        version: "1.0",
        request: {
            type: "INFO",
            local: "en-US",
            requestId: createUUID(),
            timestamp: new Date()
        },
        session: {
            attributes: {
                STATE: "_PLAY_MODE",
                enqueuedToken: false,
                index: 0,
                offsetInMilliseconds: 0,
                playbackFinished: false,
                playbackIndexChanged: false
            }
        },
        context: {
            AudioPlayer: {
                offsetInMilliseconds: 0,
                playerActivity: "PLAYING",
                token: "0"
            },
            application: {
                applicationId: "amzn1.ask.skill.4ccfe4ca-0fb8-4bd5-94c1-bc37db8c19c1"
            },
            user: {
                userId: "amzn1.ask.account.AEO4K3JDJLFAKAXEZ2DXKIFQRORXFWFQJWIBUX45ZIE7MX33D64VCLQ2PLNFRVD7JQNFPA5VG2UWLQTBZOSBSYN4TN2Q7YXRCAD63HIYT7ONP3VDVIGUKI25UCPAI5V2Q6TT76QXK6YAVARRHRIX3HKZR53NV4424ENMHWT7UXZP6766T5BISALC4Z3SLT3YHEXSQYCWCLG2RIY"
            }
        }
    };
}

export function responsePayload(): any {
    return {
        response: {
            version: "1.0",
            shouldEndSession: true,
            directives: [
                {
                    type: "AudioPlayer.Stop"
                }
            ]
        }
    };
}

export function createUUID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + "-" + s4() + "-" + s4() + "-" +
        s4() + "-" + s4() + s4() + s4();
}