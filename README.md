# bst-logging-server

## Installation


Clone it:

```bash
$ git clone https://github.com/bespoken/bst-logging-server.git
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

## Configuration

You can tweak the config in ./config.properties but don't put Mongo credentials in it. Use **BST_MONGO_URL** environment variable instead.

## Mongo

This database above is an mLab hosted free sandbox. You can change the db name at the end of the string (xapplog) to work in your own sand box.

## Swagger 

Swagger is at http://localhost:3000/api-docs/

(swagger need works)

