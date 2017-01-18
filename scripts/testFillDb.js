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

const TYPE_REQUEST = "Request";
const TYPE_RESPONSE = "Response";

const entries = createLogs(NUM);

db.logs.insert(entries);

function createLogs(numOfEntries) {
    let logEntries = [];
    let year = 2017;
    let month = 0;
    let day = 15;
    for (let i = 0; i < numOfEntries; ++i) {
        const nextEntry = createEntry(i, () => {
            if (i > 0 && i % 100 === 0) {
                --day;
            }
            return new Date(year, month, day);
        });

        logEntries.push(nextEntry);
    }
    return logEntries;
}

function createEntry(index, getDate) {
    let type;
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
    const payload = generatePayload(payloadType);
    return {
        source: generateName(index),
        transaction_id: guid(),
        payload: payload,
        log_type: type,
        tags: [payloadType, "tag" + index, "tag" + index + 1],
        timestamp: newStamp
    };
}

function generatePayload(type) {
    return (type === TYPE_REQUEST) ? generateRequestPayload() : generateResponsePayload();
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

function generateRequestPayload() {
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