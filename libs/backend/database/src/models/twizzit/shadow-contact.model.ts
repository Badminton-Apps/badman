import { Column, DataType, Model, PrimaryKey, Table } from "sequelize-typescript";
import { InferAttributes, InferCreationAttributes } from "sequelize";

@Table({
  tableName: "shadow_contact",
  schema: "twizzit",
  timestamps: false,
})
export class ShadowContact extends Model<
  InferAttributes<ShadowContact>,
  InferCreationAttributes<ShadowContact>
> {
  @PrimaryKey
  @Column({ field: "twizzit_id", type: DataType.BIGINT })
  declare twizzitId: number;

  @Column({ field: "first_name", type: DataType.TEXT })
  declare firstName: string | null;

  @Column({ field: "last_name", type: DataType.TEXT })
  declare lastName: string | null;

  @Column({ field: "date_of_birth", type: DataType.DATEONLY })
  declare dateOfBirth: string | null;

  @Column({ field: "member_id", type: DataType.TEXT })
  declare memberId: string | null;

  @Column(DataType.TEXT)
  declare gender: string | null;

  @Column(DataType.JSONB)
  declare payload: object;

  @Column({ field: "sync_run_id", type: DataType.UUIDV4 })
  declare syncRunId: string;

  @Column({ field: "fetched_at", type: DataType.DATE })
  declare fetchedAt: Date;
}
