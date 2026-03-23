# Seeder Extension Plan

## Current State Analysis

The current seed file (`20250101000000-seed-test-data.js`) contains:

- 10 utility functions for creating database entities
- Raw SQL queries (due to Sequelize CLI limitations with TypeScript)
- Repetitive error handling patterns
- Hardcoded values mixed with environment variables
- Transaction management in the main seeder

## Routes to Extend & Make Reusable

### 1. **Extract to Shared Utilities Module** ⭐ RECOMMENDED

**Structure:**

```
database/seeders/
  ├── utils/
  │   ├── index.js              # Main exports
  │   ├── seeder-context.js     # Context wrapper
  │   ├── error-handler.js      # Error handling utilities
  │   ├── query-helpers.js      # SQL query builders
  │   ├── data-factories.js     # Test data generators
  │   └── entity-builders.js    # Entity creation functions
  └── 20250101000000-seed-test-data.js
```

**Benefits:**

- Functions can be imported by multiple seeders
- Easier to test individual utilities
- Consistent patterns across all seeders
- Better code organization

**Example:**

```javascript
// database/seeders/utils/seeder-context.js
class SeederContext {
  constructor(sequelize, QueryTypes, transaction) {
    this.sequelize = sequelize;
    this.QueryTypes = QueryTypes;
    this.transaction = transaction;
  }

  async query(sql, replacements = {}) {
    return this.sequelize.query(sql, {
      replacements,
      type: this.QueryTypes.SELECT,
      transaction: this.transaction,
    });
  }

  async insert(sql, replacements = {}) {
    const [result] = await this.sequelize.query(sql, {
      replacements,
      type: this.QueryTypes.INSERT,
      transaction: this.transaction,
    });
    return result[0];
  }
}

module.exports = { SeederContext };
```

---

### 2. **Create Seeder Context/Helper Class** ⭐ RECOMMENDED

**Purpose:** Wrap common parameters and provide helper methods

**Implementation:**

```javascript
// database/seeders/utils/seeder-context.js
class SeederContext {
  constructor(sequelize, QueryTypes, transaction) {
    this.sequelize = sequelize;
    this.QueryTypes = QueryTypes;
    this.transaction = transaction;
  }

  // Helper methods for common operations
  async findOrCreate(table, where, defaults) {
    /* ... */
  }
  async findOne(table, where) {
    /* ... */
  }
  async create(table, data) {
    /* ... */
  }
  async update(table, data, where) {
    /* ... */
  }
  async delete(table, where) {
    /* ... */
  }

  // Transaction helpers
  async verifyTransaction() {
    await this.sequelize.query("SELECT 1", { transaction: this.transaction });
  }
}
```

**Usage:**

```javascript
// Before
await findOrCreatePlayer(
  sequelize,
  QueryTypes,
  transaction,
  email,
  firstName,
  lastName,
  memberId,
  gender
);

// After
const ctx = new SeederContext(sequelize, QueryTypes, transaction);
await findOrCreatePlayer(ctx, email, firstName, lastName, memberId, gender);
```

---

### 3. **Extract Common Error Handling** ⭐ RECOMMENDED

**Implementation:**

```javascript
// database/seeders/utils/error-handler.js
function handleSeederError(err, operation) {
  console.error(`❌ Error ${operation}:`);
  console.error("  Message:", err.message);
  console.error("  Code:", err.parent?.code);
  console.error("  Detail:", err.parent?.detail);
  console.error("  Constraint:", err.parent?.constraint);
  console.error("  SQL:", err.sql);
  console.error("  Full error:", JSON.stringify(err, null, 2));
  throw err;
}

function withErrorHandling(fn, operation) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      handleSeederError(err, operation);
    }
  };
}

module.exports = { handleSeederError, withErrorHandling };
```

**Usage:**

```javascript
const findOrCreatePlayer = withErrorHandling(
  async (ctx, email, firstName, lastName, memberId, gender) => {
    // ... implementation
  },
  "finding/creating player"
);
```

---

### 4. **Create Query Builder Helpers** ⭐ RECOMMENDED

**Implementation:**

```javascript
// database/seeders/utils/query-helpers.js
class QueryBuilder {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async findOrCreate(table, where, defaults) {
    const existing = await this.findOne(table, where);
    if (existing) return existing;
    return this.create(table, { ...where, ...defaults });
  }

  async findOne(table, where) {
    const conditions = Object.entries(where)
      .map(([key, val]) => `"${key}" = :${key}`)
      .join(" AND ");

    const results = await this.ctx.query(
      `SELECT * FROM "${table}" WHERE ${conditions} LIMIT 1`,
      where
    );
    return results[0] || null;
  }

  async create(table, data) {
    const columns = Object.keys(data)
      .map((k) => `"${k}"`)
      .join(", ");
    const values = Object.keys(data)
      .map((k) => `:${k}`)
      .join(", ");
    const placeholders = Object.keys(data).reduce((acc, k) => {
      acc[k] = data[k];
      return acc;
    }, {});

    const [result] = await this.ctx.sequelize.query(
      `INSERT INTO "${table}" (${columns}, "createdAt", "updatedAt")
       VALUES (${values}, NOW(), NOW())
       RETURNING *`,
      {
        replacements: placeholders,
        type: this.ctx.QueryTypes.INSERT,
        transaction: this.ctx.transaction,
      }
    );
    return result[0];
  }
}

module.exports = { QueryBuilder };
```

---

### 5. **Create Data Factories** ⭐ RECOMMENDED

**Implementation:**

```javascript
// database/seeders/utils/data-factories.js
class DataFactory {
  static generateEmail(prefix = "test") {
    return `${prefix}-${Date.now()}@example.com`;
  }

  static generateMemberId(prefix = "TEST") {
    return `${prefix}-${Date.now()}`;
  }

  static generateName() {
    const firstNames = ["John", "Jane", "Bob", "Alice", "Charlie"];
    const lastNames = ["Doe", "Smith", "Johnson", "Williams", "Brown"];
    return {
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
    };
  }

  static generateClubName(index = 1) {
    const names = ["Awesome", "Champions", "Victory", "Elite", "Premier"];
    return `${names[index % names.length]} Club ${index}`;
  }

  static getSeason(date = new Date()) {
    return date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  }

  static generateDate(season, monthOffset = 0) {
    const month = ((9 + monthOffset - 1) % 12) + 1;
    const day = 15 + (monthOffset % 15);
    return new Date(season, month - 1, day);
  }
}

module.exports = { DataFactory };
```

---

### 6. **Create Entity Builders (Fluent API)** ⭐ OPTIONAL

**Implementation:**

```javascript
// database/seeders/utils/entity-builders.js
class PlayerBuilder {
  constructor(ctx) {
    this.ctx = ctx;
    this.data = {};
  }

  withEmail(email) {
    this.data.email = email;
    return this;
  }

  withName(firstName, lastName) {
    this.data.firstName = firstName;
    this.data.lastName = lastName;
    return this;
  }

  withMemberId(memberId) {
    this.data.memberId = memberId;
    return this;
  }

  withGender(gender) {
    this.data.gender = gender;
    return this;
  }

  async findOrCreate() {
    if (this.data.email) {
      const existing = await this.ctx.query(
        `SELECT * FROM "Players" WHERE email = :email LIMIT 1`,
        { email: this.data.email }
      );
      if (existing[0]) return existing[0];
    }
    return this.create();
  }

  async create() {
    return await this.ctx.insert(
      `INSERT INTO "Players" (email, "firstName", "lastName", "memberId", gender, "createdAt", "updatedAt")
       VALUES (:email, :firstName, :lastName, :memberId, :gender, NOW(), NOW())
       RETURNING *`,
      this.data
    );
  }
}

module.exports = { PlayerBuilder };
```

**Usage:**

```javascript
const player = await new PlayerBuilder(ctx)
  .withEmail("test@example.com")
  .withName("John", "Doe")
  .withMemberId("TEST-123")
  .withGender("M")
  .findOrCreate();
```

---

### 7. **Configuration-Driven Seeders** ⭐ OPTIONAL

**Implementation:**

```javascript
// database/seeders/configs/test-data.json
{
  "player": {
    "email": "${SEED_USER_EMAIL}",
    "firstName": "${SEED_FIRST_NAME}",
    "lastName": "${SEED_LAST_NAME}",
    "memberId": "${SEED_MEMBER_ID}",
    "gender": "${SEED_GENDER}"
  },
  "clubs": [
    { "name": "TEAM AWESOME" },
    { "name": "THE OPPONENTS" }
  ],
  "encounters": {
    "count": 10
  }
}

// database/seeders/utils/config-loader.js
function loadConfig(filePath) {
  const config = require(filePath);
  // Replace environment variables
  return JSON.parse(JSON.stringify(config), (key, value) => {
    if (typeof value === "string" && value.startsWith("${") && value.endsWith("}")) {
      const envVar = value.slice(2, -1);
      return process.env[envVar] || value;
    }
    return value;
  });
}
```

---

### 8. **Seeder Registry/Manager** ⭐ OPTIONAL

**Implementation:**

```javascript
// database/seeders/utils/seeder-registry.js
class SeederRegistry {
  constructor() {
    this.seeders = [];
  }

  register(name, seederFn, dependencies = []) {
    this.seeders.push({ name, fn: seederFn, dependencies });
  }

  async run(name, queryInterface, Sequelize) {
    const seeder = this.seeders.find((s) => s.name === name);
    if (!seeder) throw new Error(`Seeder ${name} not found`);

    // Run dependencies first
    for (const dep of seeder.dependencies) {
      await this.run(dep, queryInterface, Sequelize);
    }

    await seeder.fn(queryInterface, Sequelize);
  }

  async runAll(queryInterface, Sequelize) {
    // Topological sort to respect dependencies
    const sorted = this.topologicalSort();
    for (const seeder of sorted) {
      await seeder.fn(queryInterface, Sequelize);
    }
  }
}
```

---

## Recommended Implementation Order

### Phase 1: Foundation (High Priority) ✅ COMPLETED

1. ✅ **Extract error handling utilities** - `utils/error-handler.js`

   - Created `handleSeederError()` function for standardized error logging
   - Created `withErrorHandling()` wrapper for automatic error handling
   - All entity builder functions now use standardized error handling

2. ✅ **Create SeederContext class** - `utils/seeder-context.js`

   - Wraps `sequelize`, `QueryTypes`, and `transaction` in a single context object
   - Provides helper methods: `query()`, `insert()`, `rawQuery()`, `verifyTransaction()`
   - Simplifies function signatures from 7+ parameters to just the context

3. ✅ **Extract entity creation functions** - `utils/entity-builders.js`

   - Extracted all 10 entity creation functions:
     - `findOrCreatePlayer`
     - `createClub`
     - `addPlayerToClub`
     - `createTeam`
     - `addPlayerToTeam`
     - `createEventCompetition`
     - `createSubEventCompetition`
     - `createDrawCompetition`
     - `createOpponentTeam`
     - `createEncounters`
   - All functions refactored to use `SeederContext`
   - All functions wrapped with error handling
   - Created `utils/index.js` for centralized exports

4. ✅ **Refactor existing seeder** - `20250101000000-seed-test-data.js`
   - Reduced from 818 lines to 232 lines (71% reduction)
   - All functions now use the new utilities
   - Cleaner, more maintainable code structure

### Phase 2: Enhancement (Medium Priority)

4. ⚠️ Create QueryBuilder helpers (not yet implemented - can be added if needed)
5. ⚠️ Create DataFactory for test data generation (not yet implemented - can be added if needed)
6. ✅ Refactor existing seeder to use new utilities (completed in Phase 1)

### Phase 3: Advanced (Low Priority)

7. ⚠️ Create fluent builder API (if needed)
8. ⚠️ Add configuration-driven seeding (if needed)
9. ⚠️ Create seeder registry (if multiple seeders)

---

## Example: Refactored Seeder Structure (Actual Implementation)

```javascript
// database/seeders/utils/index.js
const { SeederContext } = require("./seeder-context");
const { handleSeederError, withErrorHandling } = require("./error-handler");
const {
  findOrCreatePlayer,
  createClub,
  addPlayerToClub,
  createTeam,
  addPlayerToTeam,
  createEventCompetition,
  createSubEventCompetition,
  createDrawCompetition,
  createOpponentTeam,
  createEncounters,
} = require("./entity-builders");

module.exports = {
  SeederContext,
  handleSeederError,
  withErrorHandling,
  findOrCreatePlayer,
  createClub,
  addPlayerToClub,
  createTeam,
  addPlayerToTeam,
  createEventCompetition,
  createSubEventCompetition,
  createDrawCompetition,
  createOpponentTeam,
  createEncounters,
};
```

```javascript
// database/seeders/20250101000000-seed-test-data.js
const {
  SeederContext,
  findOrCreatePlayer,
  createClub,
  addPlayerToClub,
  createTeam,
  addPlayerToTeam,
  createEventCompetition,
  createSubEventCompetition,
  createDrawCompetition,
  createOpponentTeam,
  createEncounters,
} = require("./utils");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    const { QueryTypes } = Sequelize;

    // Get user email from environment variable (optional)
    const userEmail = process.env.SEED_USER_EMAIL || "test@example.com";
    const firstName = process.env.SEED_FIRST_NAME || "Test";
    const lastName = process.env.SEED_LAST_NAME || "User";
    const memberId = process.env.SEED_MEMBER_ID || `TEST-${Date.now()}`;
    const gender = process.env.SEED_GENDER || "M";

    return await sequelize.transaction(async (transaction) => {
      // Create seeder context
      const ctx = new SeederContext(sequelize, QueryTypes, transaction);

      // Get current season (September to April)
      const now = new Date();
      const season = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;

      // Find or create player
      const user = await findOrCreatePlayer(ctx, userEmail, firstName, lastName, memberId, gender);

      // Create first club (user's club)
      const clubId = await createClub(ctx, "TEAM AWESOME");

      // Add player to club
      await addPlayerToClub(ctx, clubId, user.id);

      // Verify transaction is still valid
      await ctx.verifyTransaction();

      // Create team
      const teamId = await createTeam(ctx, clubId, season, user.id);

      // ... rest of seeding operations
    });
  },
  // ... down method
};
```

---

## Implementation Status

### ✅ Completed (2025-03-20)

**Phase 1: Foundation** — Fully implemented with TypeScript

- ✅ Created `utils/seeder-context.ts` - SeederContext class for consistent DB access
- ✅ Created `utils/error-handler.ts` - Standardized error handling
- ✅ Created `utils/entity-builders.ts` - Entity creation functions with TypeScript types
- ✅ Created `utils/index.ts` - Centralized exports
- ✅ Created `utils/types.ts` - Type definitions (Player, Club, Team, Location, Availability, etc.)
- ✅ Refactored seeders to use TypeScript utilities with compiled dist/ output

**Phase 2: Enhancement** — Completed

- ✅ Created `utils/player-factory.ts` - PlayerFactory for batch player creation
- ✅ Created `utils/data-factory.ts` - DataFactory for generating test data
- ✅ Created `utils/ranking-builders.ts` - Ranking creation helpers
- ✅ Created `utils/membership-helpers.ts` - Club membership utilities
- ✅ Created `utils/club-team-naming.ts` - Team naming utilities
- ✅ **Added location seeding** — `createLocation()` and `createAvailability()` builders
  - Seed 2 locations per club with realistic availability schedules
  - Support for court counts and exception dates (e.g. Christmas closures)
- ✅ **Split admin seeder** — `20250101000001-seed-admin-user.js`
  - Independent admin user creation with global claims
  - Can run before/after main test-data seeder

**Results:**

- Utilities now in TypeScript with full type safety
- Main seeders use compiled JS output from `dist/`
- Location and availability seeding fully integrated
- Admin user seeding is independent and reusable
- All entity functions are reusable across multiple seeders
- Consistent error handling across all functions

**File Structure:**

```
database/seeders/
├── utils/                      ✅ TypeScript utilities
│   ├── seeder-context.ts
│   ├── error-handler.ts
│   ├── entity-builders.ts      (includes createLocation, createAvailability)
│   ├── types.ts
│   ├── player-factory.ts
│   ├── ranking-builders.ts
│   ├── membership-helpers.ts
│   ├── club-team-naming.ts
│   ├── data-factory.ts
│   ├── tsconfig.json
│   ├── index.ts
│   └── dist/                   ✅ Compiled JS output
│       ├── *.js
│       └── *.d.ts
├── 20250101000000-seed-test-data.js   ✅ Test data (clubs, teams, locations)
├── 20250101000001-seed-admin-user.js  ✅ Admin user (independent)
├── README.md                   ✅ Updated docs
└── SEEDER_EXTENSION_PLAN.md    ✅ This file
```

### ⚠️ Future Enhancements

The following items from the plan are not yet implemented but can be added as needed:

- QueryBuilder helpers for lower-level query construction (Phase 3)
- Fluent builder API (e.g. `new PlayerBuilder(ctx).withEmail(...).create()`)
- Configuration-driven seeding via JSON config files
- Seeder registry for dependency management between seeders

## Benefits Summary

1. **Reusability**: Functions can be used across multiple seeders ✅
2. **Maintainability**: Changes in one place affect all seeders ✅
3. **Testability**: Individual utilities can be unit tested ✅
4. **Consistency**: Same patterns across all seeders ✅
5. **Readability**: Cleaner, more focused code ✅
6. **Extensibility**: Easy to add new entity types or seeders ✅
