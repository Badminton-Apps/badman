import { Column, DataType, Index, Model, PrimaryKey, Table } from "sequelize-typescript";
import { InferAttributes, InferCreationAttributes } from "sequelize";

@Table({
  tableName: "shadow_membership",
  schema: "twizzit",
  timestamps: false,
})
export class ShadowMembership extends Model<
  InferAttributes<ShadowMembership>,
  InferCreationAttributes<ShadowMembership>
> {
  @PrimaryKey
  @Column({ field: "twizzit_id", type: DataType.BIGINT })
  declare twizzitId: number;

  @Index("idx_shadow_membership_contact_id")
  @Column({ field: "contact_id", type: DataType.BIGINT })
  declare contactId: number | null;

  @Index("idx_shadow_membership_club_id")
  @Column({ field: "club_id", type: DataType.BIGINT })
  declare clubId: number | null;

  @Index("idx_shadow_membership_type_id")
  @Column({ field: "membership_type_id", type: DataType.BIGINT })
  declare membershipTypeId: number | null;

  @Column({ field: "season_id", type: DataType.BIGINT })
  declare seasonId: number | null;

  @Column({ field: "start_date", type: DataType.DATEONLY })
  declare startDate: string | null;

  @Column({ field: "end_date", type: DataType.DATEONLY })
  declare endDate: string | null;

  @Column(DataType.JSONB)
  declare payload: object;

  @Column({ field: "sync_run_id", type: DataType.UUIDV4 })
  declare syncRunId: string;

  @Column({ field: "fetched_at", type: DataType.DATE })
  declare fetchedAt: Date;
}
