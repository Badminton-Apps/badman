#!/bin/bash

# Reset badman-db database script

set -e

echo "🗑️  Dropping badman-db database..."
psql postgres -c 'DROP DATABASE IF EXISTS "badman-db";'

echo "🆕 Creating badman-db database..."
psql postgres -c 'CREATE DATABASE "badman-db";'

echo "🔑 Granting privileges to panda..."
psql postgres -c 'GRANT ALL PRIVILEGES ON DATABASE "badman-db" TO panda;'

echo "🌍 Creating PostGIS extension..."
psql "badman-db" -c 'CREATE EXTENSION IF NOT EXISTS postgis;'

echo "✅ Database reset complete!"

