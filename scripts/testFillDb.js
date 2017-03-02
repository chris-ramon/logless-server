"use strict";

const NUM = 10000;

const intents = [
    "IntentRequest",
    "intent2",
    "intent3",
    "IntentRequest",
    "intent5",
    "intent6",
    "IntentRequest",
    "intent8",
    "intent9",
    "intent10"
]

const actions = [
    "Action1",
    "Action2",
    "Action3",
    "Action4",
    "Action5",
    "Action6",
    "Action7",
    "Action8",
    "Action9",
    "Action10"
]

const sessionUsers = [
    "amzn1.ask.account",
    undefined,
    "amzn1.ask.account",
    "amzn2.ask.account",
    undefined,
    "amzn2.ask.account"
]

const contextUsers = [
    undefined,
    "amzn1.ask.account",
    "amzn1.ask.account",
    undefined,
    "amzn2.ask.account",
    "amzn2.ask.account"
]

const TYPE_REQUEST = "Request";
const TYPE_RESPONSE = "Response";

const entries = createLogs(NUM);

db.logs.insert(entries);

function createLogs(numOfEntries) {
    var logEntries = [];
    var year = 2017;
    var month = 0;
    var day = 15;
    var hour = 0;
    var payloadGenerator = generateAmazonPayload;
    for (var i = 0; i < numOfEntries; ++i) {
        if (i % 4 === 0) {
            payloadGenerator = generateHomePayload;
        } else if (i % 2 === 0) {
            payloadGenerator = generateAmazonPayload;
        }

        const nextEntry = createEntry(i, () => {
            if (i > 0 && i % 100 === 0) {
                --day;
            }
            if (i > 0 && i % 25 === 0) {
                hour = ++hour % 24;
            }
            return new Date(year, month, day, hour);
        }, payloadGenerator);

        logEntries.push(nextEntry);
    }
    return logEntries;
}

function createEntry(index, getDate, generatePayload) {
    var type;
    switch (index % 3) {
        case 0:
            type = "INFO";
            break;
        case 1:
            type = "ERROR";
            break;
        case 2:
            type = "DEBUG";
            break;
    }
    const newStamp = getDate();
    const payloadType = (index % 2 === 0) ? TYPE_REQUEST : TYPE_RESPONSE;
    const payload = generatePayload(payloadType, index);
    return {
        source: generateName(index),
        transaction_id: guid(),
        payload: payload,
        log_type: type,
        tags: [payloadType, "tag" + index, "tag" + index + 1],
        timestamp: newStamp
    };
}

function generateAmazonPayload(type, index) {
    return (type === TYPE_REQUEST) ? generateAmazonRequestPayload(index) : generateAmazonResponsePayload();
}

function generateHomePayload(type, index) {
    return (type === TYPE_REQUEST) ? generateGoogleHomeRequestPayload(index) : generateGoogleHomeResponsePayload();
}

function generateAmazonRequestPayload(index) {
    const number = getRandomInt(0, intents.length);
    const requestType = intents[number % intents.length];
    const action = actions[number % actions.length];
    const payload = {
        version: "1.0",
        request: {
            type: requestType,
            local: "en-US",
            requestId: guid(),
            timestamp: new Date(),
            intent: {
                name: "Amazon." + action
            },
            inDialog: false
        },
        session: {
            user: {
                userId: sessionUsers[index % contextUsers.length]
            },
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
            System: {
                user: {
                    userId: contextUsers[index % contextUsers.length]
                }
            }
        }
    }

    return payload;
}

function generateAmazonResponsePayload() {
    const payload = {
        response: {
            version: "1.0",
            shouldEndSession: true,
            directives: [
                {
                    type: "AudioPlayer.Stop"
                }
            ]
        }
    }
    return payload;
}

function generateGoogleHomeRequestPayload(index) {
    const number = getRandomInt(0, intents.length);
    const requestType = intents[number % intents.length];
    const action = actions[number % actions.length];
    const convoId = getRandomInt(0, Math.pow(2, 53) - 1); // Maximum integer allowed in Javascript
    return {
        id: guid(),
        timestamp: new Date(),
        result: {
            source: "agent",
            resolvedQuery: "GOOGLE_ASSISTANT_WELCOME",
            speech: "",
            action: "Google." + action,
            actionIncomplete: false,
            contexts: [
                {
                    name: "google_assistant_welcome",
                    lifespan: 0
                }
            ],
            metadata: {
                intentId: guid(),
                webhookUsed: true,
                webhookForSlotFillingUsed: false,
                intentName: "Initial Intent " + action
            },
            fulfillment: {
                speech: "",
                messages: [
                    {
                        type: 0,
                        speech: ""
                    }
                ]
            },
            score: 1
        },
        status: {
            code: 200,
            errorType: "success"
        },
        sessionId: convoId,
        originalRequest: {
            source: "google",
            data: {
                inputs: [
                    {
                        arguments: [],
                        intent: action,
                        raw_inputs: [
                            {
                                query: requestType,
                                input_type: 2
                            }
                        ]
                    }
                ],
                user: {
                    userId: contextUsers[index % contextUsers.length]
                },
                conversation: {
                    conversation_id: convoId,
                    type: 1
                }
            }
        }
    }
}

function generateGoogleHomeResponsePayload() {
    return {
        speech: "<speak> <audio src=\"https://s3.amazonaws.com/xapp-files/Voice+Apps/Progressive/Progressive-Home_Page.mp3\" /> <break time=\"0.2s\"/> Which would you like to hear? </speak>",
        data: {
            google: {
                expect_user_response: true,
                is_ssml: true,
                no_input_prompts: [
                    {
                        ssml: "<speak> Would you like to hear tips about your car, or tips about your home? </speak>"
                    }
                ],
                contextOut: [
                    {
                        name: "_actions_on_google_",
                        lifespan: 100,
                        parameters: {
                            LASTINTENT: {
                                name: "LaunchIntent",
                                utterances: [],
                                action: {
                                    ask: {
                                        text: "<speak> <audio src=\"https://s3.amazonaws.com/xapp-files/Voice+Apps/Progressive/Progressive-Home_Page.mp3\" /> <break time=\"0.2s\"/> Which would you like to hear? </speak>",
                                        type: "TEXT"
                                    },
                                    reprompt: {
                                        text: "<speak> Would you like to hear tips about your car, or tips about your home? </speak>",
                                        type: "TEXT"
                                    }
                                },
                                expectedIntents: [
                                    "HomePage",
                                    "Help",
                                    "CarTips",
                                    "CarBuying",
                                    "InsuranceQuote",
                                    "UsedCarTips",
                                    "CarCareTips",
                                    "HomeTips",
                                    "CurbAppeal",
                                    "SmartHome",
                                    "Moving",
                                    "MoreChoices",
                                    "Repeat"
                                ]
                            },
                            LASTPROMPT: "<speak> <audio src=\"https://s3.amazonaws.com/xapp-files/Voice+Apps/Progressive/Progressive-Home_Page.mp3\" /> <break time=\"0.2s\"/> Which would you like to hear? </speak>"
                        }
                    }
                ]
            }
        }
    }
}

function generateName(index) {
    switch (index % 5) {
        case 0:
            return "happy_einstein";

        case 1:
            return "sad_einstein";

        case 2:
            return "excited_einstein";

        case 3:
            return "scared_einstein";

        case 4:
            return "joyful_einstein";
    }
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}