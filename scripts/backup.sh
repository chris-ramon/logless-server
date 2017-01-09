#!/usr/bin/env bash

# Save
mongodump --host 10.0.100.52 --db xapplog --collection logs --port 27017 --username xappuser --password Winter123 --out Dumps/mongo/mongodump-yyyy-mm-dd-1

# Restore
# mongorestore --host 10.0.100.52 --port 27017 --username xappadmin --password Winter123 Dumps/mongo/mongodump-yyyy-mm-dd-1

