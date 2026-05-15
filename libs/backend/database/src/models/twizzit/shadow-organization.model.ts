import { Column, DataType, Model, PrimaryKey, Table } from "sequelize-typescript";
import { InferAttributes, InferCreationAttributes } from "sequelize";

@Table({
  tableName: "shadow_organization",
  schema: "twizzit",
  timestamps: false,
})
export class ShadowOrganization extends Model<
  InferAttributes<ShadowOrganization>,
  InferCreationAttributes<ShadowOrganization>
> {
  @PrimaryKey
  @Column({ field: "twizzit_id", type: DataType.BIGINT })
  declare twizzitId: number;

  @Column(DataType.TEXT)
  declare name: string | null;

  @Column(DataType.JSONB)
  declare payload: object;

  @Column({ field: "sync_run_id", type: DataType.UUIDV4 })
  declare syncRunId: string;

  @Column({ field: "fetched_at", type: DataType.DATE })
  declare fetchedAt: Date;
}
