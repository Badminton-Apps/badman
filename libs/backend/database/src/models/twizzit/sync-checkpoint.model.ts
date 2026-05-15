import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from "sequelize-typescript";
import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { SyncRun } from "./sync-run.model";

export type CheckpointEntityType =
  | "organization"
  | "extra_field"
  | "membership_type"
  | "membership"
  | "contact";

@Table({
  tableName: "sync_checkpoint",
  schema: "twizzit",
  timestamps: false,
  updatedAt: "updatedAt",
  createdAt: false,
})
export class SyncCheckpoint extends Model<
  InferAttributes<SyncCheckpoint>,
  InferCreationAttributes<SyncCheckpoint>
> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Unique("uq_sync_checkpoint_run_entity")
  @ForeignKey(() => SyncRun)
  @Column({ field: "sync_run_id", type: DataType.UUIDV4 })
  declare syncRunId: string;

  @Unique("uq_sync_checkpoint_run_entity")
  @Column({ field: "entity_type", type: DataType.TEXT })
  declare entityType: CheckpointEntityType;

  @Column({ field: "last_offset", type: DataType.INTEGER })
  declare lastOffset: number;

  @Column({ field: "page_size", type: DataType.INTEGER })
  declare pageSize: number;

  @Column({ field: "records_written", type: DataType.BIGINT })
  declare recordsWritten: number;

  @Column(DataType.DATE)
  declare updatedAt: CreationOptional<Date>;

  @BelongsTo(() => SyncRun, "syncRunId")
  declare syncRun: SyncRun;
}
