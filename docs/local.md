#### Running [`bst-logging-server`](https://github.com/bespoken/logless-server) locally.

1. [Install MongoDB](https://docs.mongodb.com/manual/installation/).

2. Start mongod service:
```
sudo service mongod start
```

3. Start the mongo client:
```bash
mongo
```

4. Create the logless database:
```bash
use logless
```

5. Create the logless user:
```bash
db.createUser(
   {
     user: "loglessuser",
     pwd: "loglessuser",
     roles: [ "readWrite", "dbAdmin" ]
   }
)
```

6. Set the env variables and run the server:
```bash
export BST_MONGO_URL=mongodb://loglessuser:loglessuser@localhost:27017/loglessdb
node bin/bst-logging-server.js
```

7. Create some test data:
```bash
curl -v http://localhost:3000/v1/receive -H 'Content-Type: application/json' -d ' { "source": "happy_eintein", "transaction_id": "tx44", "logs": [{ "payload": "a load of payload 44", "tags": ["tag1", "tag3"], "timestamp": "2016-10-12T15:55:30.811Z", "log_type": "INFO" }, { "payload": "a load of payload 55", "tags": ["tag1", "tag5"], "timestamp": "2016-10-12T15:55:30.811Z", "log_type": "ERROR" }] }'
```

8. All done!, query for the test data recently created [http://localhost:3000/v1/query?source=happy_eintein](http://localhost:3000/v1/query?source=happy_eintein)
