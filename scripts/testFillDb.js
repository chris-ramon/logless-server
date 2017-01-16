"use strict";

const NUM = 10000;

const entries = createLogs(NUM);

db.logs.insert(entries);

function createLogs(numOfEntries) {
    let logEntries = [];
    const timestamp = new Date();
    for (let i = 0; i < numOfEntries; ++i) {
        const nextEntry = createEntry(i, timestamp, () => {
            if (i % 10 === 0) {
                timestamp.setDate(timestamp.getDate() - 1);
            }
            return timestamp;
        });

        logEntries.push(nextEntry);
    }
    return logEntries;
}

function createEntry(index, currentTimestamp, getDate) {
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
    return {
        source: generateName(index),
        transaction_id: guid(),
        payload: "Entry " + index,
        log_type: type,
        tags: ["tag" + index, "tag" + index + 1],
        timestamp: newStamp.toISOString()
    };
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