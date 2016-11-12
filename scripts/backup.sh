#!/usr/bin/env bash

# Save
mongodump --host ds029804.mlab.com --db xapplog --collection logs --port 29804 --username xappuser --password Winter123 --out /Users/bvizy/Dumps/mongo/mongodump-2016-11-11-1

# Restore
mongorestore --host 10.0.100.52 --port 27017 --username xappadmin --password Winter123 /Users/bvizy/Dumps/mongo/mongodump-2016-11-11-1
