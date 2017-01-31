"use strict";

const NUM = 10000;

const intents = [
    "intent1",
    "intent2",
    "intent3",
    "intent4", 
    "intent5",
    "intent6",
    "intent7",
    "intent8",
    "intent9",
    "intent10"
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
    for (var i = 0; i < numOfEntries; ++i) {
        const nextEntry = createEntry(i, () => {
            if (i > 0 && i % 100 === 0) {
                --day;
            }
            if (i > 0 && i % 24 === 0) {
                hour = ++hour % 24;
            }
            return new Date(year, month, day, hour);
        });

        logEntries.push(nextEntry);
    }
    return logEntries;
}

function createEntry(index, getDate) {
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

function generatePayload(type, index) {
    return (type === TYPE_REQUEST) ? generateRequestPayload(index) : generateResponsePayload();
}

function generateResponsePayload() {
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

function generateRequestPayload(index) {
    const number = getRandomInt(0, intents.length);
    const requestType = intents[number];
    const payload = {
        version: "1.0", 
        request: {
            type: requestType,
            local: "en-US",
            requestId: guid(),
            timestamp: new Date()
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

function generateName(index) {
    switch(index % 5) {
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