# bst-logging-server

## Installation


Clone it:

```bash
$ git clone https://github.com/bespoken/logless-server.git
```

Initial setup:

```bash
$ npm install
$ typings install
$ tsc 
```

## Quick Start

```bash
$ export BST_MONGO_URL=mongodb://xappuser:XappXapp2016@ds029804.mlab.com:29804/xapplog
$ node bin/bst-logging-server.js
```

(See me for the password. It's not that.)

## Configuration

You can tweak the config in ./config.properties but don't put Mongo credentials in it. Use **BST_MONGO_URL** environment variable instead.

## Mongo

This database above is an mLab hosted free sandbox. You can change the db name at the end of the string (xapplog) to work in your own sand box.

## Swagger 

Swagger is at http://localhost:3000/api-docs/

(swagger need works)

## Test

POST this JSON below to Postman to create:

http://localhost:3000/v1/receive

```json
{
	"source": "happy_eintein",
	"transaction_id": "tx44",
	"logs": [{
		"payload": "a load of payload 44",
		"tags": ["tag1", "tag3"],
		"timestamp": "2016-10-12T15:55:30.811Z",
		"log_type": "INFO"
	}, {
		"payload": "a load of payload 55",
		"tags": ["tag1", "tag5"],
		"timestamp": "2016-10-12T15:55:30.811Z",
		"log_type": "ERROR"
	}]
}
```


GET this to query logs:

http://localhost:3000/api/query?source=happy_einstein&start_time=2016-10-12T16:00:30.811Z&end_time=2016-10-12T16:04:30.811Z


GET a new source name:

http://localhost:3000/api/source