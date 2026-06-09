# Data Model: Rescue Enrollment Remarks

## Entity: EnrollmentRemark

**Table**: `event.enrollment_remarks`  
**Schema**: `event`  
**Type**: Append-only; no update or delete mutations.

### Fields

| Column       | Sequelize Type             | PG Type                    | Constraints                       | Notes                                                                                           |
| ------------ | -------------------------- | -------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `id`         | `UUIDV4`                   | `uuid`                     | PK, NOT NULL                      | `uuid_generate_v4()` default                                                                    |
| `clubId`     | `UUIDV4`                   | `uuid`                     | NOT NULL, FK → `public.Clubs(id)` | Foreign key                                                                                     |
| `season`     | `INTEGER`                  | `int4`                     | NOT NULL                          | No range validation                                                                             |
| `remarks`    | `TEXT`                     | `text`                     | NOT NULL                          | Validated non-empty before insert                                                               |
| `adminEmail` | `STRING`                   | `varchar(255)`             | NULL                              | Informational only; not validated                                                               |
| `source`     | `ENUM('rescue', 'normal')` | `rescue_remark_source`     | NOT NULL, default `'rescue'`      | Hardcoded to `'rescue'` via resolver                                                            |
| `createdAt`  | `DATE`                     | `timestamp with time zone` | NOT NULL, auto-set by Sequelize   |                                                                                                 |
| `updatedAt`  | `DATE`                     | `timestamp with time zone` | NOT NULL, auto-set by Sequelize   | Not semantically meaningful; included because Sequelize adds it by default; spec is append-only |

### Associations

- `BelongsTo Club` via `clubId`

### Sequelize model file

```
libs/backend/database/src/models/event/enrollment-remark.model.ts
```

Skeleton:

```typescript
@Table({ timestamps: true, schema: "event", tableName: "enrollment_remarks" })
@ObjectType("EnrollmentRemark")
export class EnrollmentRemark extends Model<
  InferAttributes<EnrollmentRemark>,
  InferCreationAttributes<EnrollmentRemark>
> {
  @Field(() => ID)
  @PrimaryKey
  @IsUUID(4)
  @Default(DataType.UUIDV4)
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Field(() => ID)
  @ForeignKey(() => Club)
  @Column(DataType.UUIDV4)
  declare clubId: string;

  @Field(() => Int)
  @Column(DataType.INTEGER)
  declare season: number;

  @Field(() => String)
  @Column(DataType.TEXT)
  declare remarks: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  declare adminEmail: CreationOptional<string | null>;

  @Field(() => String)
  @Column(DataType.ENUM("rescue", "normal"))
  declare source: "rescue" | "normal";

  @BelongsTo(() => Club)
  declare club: Relation<Club>;
}
```

---

## Migration

**File**: `database/migrations/20260609000000-create_enrollment_remarks.js`

```javascript
"use strict";

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `CREATE TYPE event.rescue_remark_source AS ENUM ('rescue', 'normal')`,
        { transaction: t }
      );
      await queryInterface.createTable(
        { tableName: "enrollment_remarks", schema: "event" },
        {
          id: {
            type: queryInterface.sequelize.constructor.DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: queryInterface.sequelize.literal("uuid_generate_v4()"),
          },
          clubId: {
            type: queryInterface.sequelize.constructor.DataTypes.UUID,
            allowNull: false,
            references: { model: { tableName: "Clubs", schema: "public" }, key: "id" },
          },
          season: {
            type: queryInterface.sequelize.constructor.DataTypes.INTEGER,
            allowNull: false,
          },
          remarks: {
            type: queryInterface.sequelize.constructor.DataTypes.TEXT,
            allowNull: false,
          },
          adminEmail: {
            type: queryInterface.sequelize.constructor.DataTypes.STRING,
            allowNull: true,
          },
          source: {
            type: queryInterface.sequelize.literal("event.rescue_remark_source"),
            allowNull: false,
            defaultValue: "rescue",
          },
          createdAt: {
            type: queryInterface.sequelize.constructor.DataTypes.DATE,
            allowNull: false,
          },
          updatedAt: {
            type: queryInterface.sequelize.constructor.DataTypes.DATE,
            allowNull: false,
          },
        },
        { transaction: t }
      );
    });
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable(
        { tableName: "enrollment_remarks", schema: "event" },
        { transaction: t }
      );
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS event.rescue_remark_source`, {
        transaction: t,
      });
    });
  },
};
```

---

## GraphQL Input Type

**File**: `libs/backend/graphql/src/resolvers/event/competition/save-enrollment-remarks.input.ts`

```typescript
@InputType()
export class SaveEnrollmentRemarksInput {
  @Field(() => ID)
  clubId: string;

  @Field(() => Int)
  season: number;

  @Field(() => String)
  remarks: string;

  @Field(() => String, { nullable: true })
  adminEmail?: string;
}
```
