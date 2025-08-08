# Database Scripts

This directory contains utility scripts for database operations.

## Scripts

### cleanup-orphaned-event-entries.js

A standalone script to clean up orphaned EventEntry records that reference non-existent subEventId or drawId values.

**What it does:**

- Removes tournament entries with invalid subEventId (not in SubEventTournaments)
- Removes competition entries with invalid subEventId (not in SubEventCompetitions)
- Removes tournament entries with invalid drawId (not in DrawTournaments)
- Removes competition entries with invalid drawId (not in DrawCompetitions)

**Usage:**

```bash
# Run against development database (default)
node scripts/db/cleanup-orphaned-event-entries.js

# Run against specific environment
node scripts/db/cleanup-orphaned-event-entries.js development
node scripts/db/cleanup-orphaned-event-entries.js beta
node scripts/db/cleanup-orphaned-event-entries.js prod
```

**Features:**

- ✅ Transaction-safe operations
- ✅ Detailed logging with emojis for easy reading
- ✅ Summary statistics
- ✅ Environment-specific database connections
- ✅ Error handling and graceful cleanup
- ✅ Connection validation before operations

**Example output:**

```
🚀 Starting cleanup of orphaned EventEntry records in development environment...
✅ Database connection established successfully

📋 Step 1: Processing entries with subEventId...
🗑️  Deleted 5 orphaned tournament entries with invalid subEventId
🗑️  Deleted 2 orphaned competition entries with invalid subEventId

📋 Step 2: Processing entries with drawId...
🗑️  Deleted 3 orphaned tournament entries with invalid drawId
🗑️  Deleted 1 orphaned competition entries with invalid drawId

📊 Summary:
   • SubEvent orphans: 7
   • Draw orphans: 4
   • Total cleaned: 11

🧹 Cleanup completed successfully

💡 Note: No foreign key constraints added due to polymorphic relationship design
   Application-level cascade deletion is handled in sync processors
🔌 Database connection closed
✅ Script completed successfully
```

**Safety:**

- All operations are wrapped in a database transaction
- The script validates the database connection before proceeding
- Detailed error reporting if something goes wrong
- Graceful cleanup of database connections

---

### get all foreignkeys.sql

SQL script to retrieve all foreign key constraints in the database.

**Usage:**

```bash
# Run this in your database client or psql
\i scripts/db/get\ all\ foreignkeys.sql
```
