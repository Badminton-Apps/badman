import { Column, DataType, Model, PrimaryKey, Table } from "sequelize-typescript";
import { InferAttributes, InferCreationAttributes } from "sequelize";

@Table({
  tableName: "shadow_membership_type",
  schema: "twizzit",
  timestamps: false,
})
export class ShadowMembershipType extends Model<
  InferAttributes<ShadowMembershipType>,
  InferCreationAttributes<ShadowMembershipType>
> {
  @PrimaryKey
  @Column({ field: "twizzit_id", type: DataType.BIGINT })
  declare twizzitId: number;

  @Column(DataType.JSONB)
  declare payload: object;

  @Column({ field: "sync_run_id", type: DataType.UUIDV4 })
  declare syncRunId: string;

  @Column({ field: "fetched_at", type: DataType.DATE })
  declare fetchedAt: Date;
}
