import {
  Column,
  DataType,
  Default,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { SyncCheckpoint } from "./sync-checkpoint.model";

export type SyncRunStatus = "pending" | "running" | "completed" | "failed";

@Table({
  tableName: "sync_run",
  schema: "twizzit",
  timestamps: true,
})
export class SyncRun extends Model<InferAttributes<SyncRun>, InferCreationAttributes<SyncRun>> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Column(DataType.TEXT)
  declare status: SyncRunStatus;

  @Column(DataType.BIGINT)
  declare organizationId: number | null;

  @Column({ field: "started_at", type: DataType.DATE })
  declare startedAt: Date | null;

  @Column({ field: "finished_at", type: DataType.DATE })
  declare finishedAt: Date | null;

  @Column({ field: "page_size", type: DataType.INTEGER })
  declare pageSize: number | null;

  @Column({ field: "inter_page_delay_ms", type: DataType.INTEGER })
  declare interPageDelayMs: number | null;

  @Column(DataType.JSONB)
  declare counts: Record<string, number> | null;

  @Column({ field: "error_summary", type: DataType.TEXT })
  declare errorSummary: string | null;

  @HasMany(() => SyncCheckpoint, "syncRunId")
  declare checkpoints: SyncCheckpoint[];
}
