import { Logger } from "@nestjs/common";
import { Field, ID, InputType, Int, ObjectType, OmitType, PartialType } from "@nestjs/graphql";
import {
  BelongsToGetAssociationMixin,
  BelongsToGetAssociationMixinOptions,
  BelongsToSetAssociationMixin,
  CreationOptional,
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin,
  InferAttributes,
  InferCreationAttributes,
  SaveOptions,
} from "sequelize";
import {
  BeforeCreate,
  BeforeUpdate,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasOne,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
} from "sequelize-typescript";
import { EntryMetaType } from "../../types";
import { Relation } from "../../wrapper";
import { Player } from "../player.model";
import { Team } from "../team.model";
import { DrawCompetition, SubEventCompetition } from "./competition";
import { Standing } from "./standing.model";
import { DrawTournament, SubEventTournament } from "./tournament";

/**
 * Minimal interface — avoids importing from @badman/backend-competition-enrollment
 * which already imports from @badman/backend-database (cycle).
 */
interface IIndexCalculationService {
  calculateOne(
    input: {
      key: string;
      type?: string;
      season?: number;
      systemId?: string;
      subEventCompetitionId?: string;
      players: { id: string }[];
    },
    options?: { transaction?: unknown; caller?: string }
  ): Promise<
    | {
        _tag: "success";
        index: number;
        resolvedPlayers: { id: string; single: number; double: number; mix: number }[];
      }
    | { _tag: "failure"; error: { code: string; message: string } }
  >;
}

@Table({
  timestamps: true,
  schema: "event",
  tableName: "Entries",
} as TableOptions)
@ObjectType({ description: "A EventEntry" })
export class EventEntry extends Model<
  InferAttributes<EventEntry>,
  InferCreationAttributes<EventEntry>
> {
  private static _indexService: IIndexCalculationService | null = null;

  /**
   * Called by EnrollmentModule.onModuleInit() to register the service instance.
   * The static registration avoids a circular module dependency:
   *   @badman/backend-competition-enrollment → @badman/backend-database → (cycle)
   */
  static setIndexCalculationService(service: IIndexCalculationService): void {
    EventEntry._indexService = service;
  }

  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @BelongsTo(() => Team, "teamId")
  team?: Relation<Team>;

  @Column(DataType.DATE)
  @Field(() => Date, { nullable: true })
  date?: Date;

  @ForeignKey(() => Team)
  @Field(() => String, { nullable: true })
  @Column(DataType.UUIDV4)
  teamId?: string;

  @BelongsTo(() => Player, "player1Id")
  player1?: Relation<Player>;

  @ForeignKey(() => Player)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  player1Id?: string;

  @BelongsTo(() => Player, "player2Id")
  player2?: Relation<Player>;

  @ForeignKey(() => Player)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  player2Id?: string;

  @Field(() => Date, { nullable: true })
  @Column({ type: DataType.DATE })
  sendOn?: Date;

  @BelongsTo(() => SubEventTournament, {
    foreignKey: "subEventId",
    constraints: false,
  })
  subEventTournament?: Relation<SubEventTournament>;

  /**
   * Draw get's deciede upon draw
   */
  @Field(() => DrawTournament, { nullable: true })
  @BelongsTo(() => DrawTournament, {
    foreignKey: "drawId",
    constraints: false,
  })
  drawTournament?: Relation<DrawTournament>;

  @Field(() => SubEventCompetition, { nullable: true })
  @BelongsTo(() => SubEventCompetition, {
    foreignKey: "subEventId",
    constraints: false,
  })
  subEventCompetition?: Relation<SubEventCompetition>;

  /**
   * Draw get's deciede upon draw
   */
  @BelongsTo(() => DrawCompetition, {
    foreignKey: "drawId",
    constraints: false,
  })
  drawCompetition?: Relation<DrawCompetition>;

  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  subEventId?: string;
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  drawId?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  entryType?: string;

  @HasOne(() => Standing)
  standing?: Standing;

  @Field(() => EntryMetaType, { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  meta?: MetaEntry;

  // Belongs to Team
  getTeam!: BelongsToGetAssociationMixin<Team>;
  setTeam!: BelongsToSetAssociationMixin<Team, string>;

  // Belongs to Player1
  getPlayer1!: BelongsToGetAssociationMixin<Player>;
  setPlayer1!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to Player2
  getPlayer2!: BelongsToGetAssociationMixin<Player>;
  setPlayer2!: BelongsToSetAssociationMixin<Player, string>;

  getPlayers(options?: BelongsToGetAssociationMixinOptions) {
    if (!this.player1Id && !this.player2Id) {
      Logger.warn("No id's set?");
      return Promise.resolve([]);
    }

    if (this.player1Id && this.player2Id) {
      return Promise.all([this.getPlayer1(options), this.getPlayer2(options)]);
    } else {
      return Promise.all([this.getPlayer1(options)]);
    }
  }

  // Belongs to TournamentSubEvent
  getSubEventTournament!: BelongsToGetAssociationMixin<SubEventTournament>;
  setSubEventTournament!: BelongsToSetAssociationMixin<SubEventTournament, string>;

  // Belongs to TournamentDraw
  getDrawTournament!: BelongsToGetAssociationMixin<DrawTournament>;
  setDrawTournament!: BelongsToSetAssociationMixin<DrawTournament, string>;

  // Belongs to TournamentSubEvent
  getSubEventCompetition!: BelongsToGetAssociationMixin<SubEventCompetition>;
  setSubEventCompetition!: BelongsToSetAssociationMixin<SubEventCompetition, string>;

  // Belongs to drawCompetition
  getDrawCompetition!: BelongsToGetAssociationMixin<DrawCompetition>;
  setDrawCompetition!: BelongsToSetAssociationMixin<DrawCompetition, string>;

  // Has one Standing
  getStanding!: HasOneGetAssociationMixin<Standing>;
  setStanding!: HasOneSetAssociationMixin<Standing, string>;

  // recalculate competition index
  @BeforeUpdate
  @BeforeCreate
  static async recalculateCompetitionIndex(instance: EventEntry, options: SaveOptions) {
    if (!instance.changed("meta")) return;
    if (!instance.meta?.competition) return;

    const team = await instance.getTeam();
    if (!team) return;

    const service = EventEntry._indexService;
    if (!service) {
      throw new Error(
        "IndexCalculationService is not registered on EventEntry. " +
          "Ensure EnrollmentModule is imported by the application module."
      );
    }

    const result = await service.calculateOne(
      {
        key: instance.id!,
        type: team.type!,
        // `season` intentionally omitted: the service derives it from the
        // sub-event's linked EventCompetition when subEventCompetitionId is set.
        subEventCompetitionId: instance.subEventId ?? undefined,
        players: (instance.meta.competition.players ?? []).map((p) => ({ id: p.id! })),
      },
      { transaction: options?.transaction, caller: "EventEntry.recalculateCompetitionIndex" }
    );

    if (result._tag === "failure") {
      throw new Error(
        `Index recalculation failed for entry ${instance.id}: ${result.error.code} — ${result.error.message}`
      );
    }

    const resolvedMap = new Map(result.resolvedPlayers.map((p) => [p.id, p]));
    instance.meta.competition.players = (instance.meta.competition.players ?? []).map((p) => {
      const resolved = resolvedMap.get(p.id!);
      if (!resolved) return p;
      return { ...p, single: resolved.single, double: resolved.double, mix: resolved.mix };
    });
    instance.meta.competition.teamIndex = result.index;
  }
}

@InputType()
export class EventEntryCompetitionPlayerMetaInput {
  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => Int, { nullable: true })
  single?: number;

  @Field(() => Int, { nullable: true })
  double?: number;

  @Field(() => Int, { nullable: true })
  mix?: number;

  @Field(() => String, { nullable: true })
  gender?: "M" | "F";

  @Field(() => Boolean, { nullable: true })
  levelException?: boolean;

  @Field(() => Boolean, { nullable: true })
  levelExceptionRequested?: boolean;

  @Field(() => String, { nullable: true })
  levelExceptionReason?: string;
}
@InputType()
export class EventEntryCompetitionMetaInput {
  @Field(() => Int, { nullable: true })
  teamIndex?: number;

  @Field(() => [EventEntryCompetitionPlayerMetaInput], { nullable: true })
  players?: EventEntryCompetitionPlayerMetaInput[];
}

@InputType()
export class EventEntryTournamentMetaInput {
  @Field(() => Int, { nullable: true })
  place?: number;
}

@InputType()
export class EventEntryMetaInput {
  @Field(() => EventEntryTournamentMetaInput, { nullable: true })
  tournament?: EventEntryTournamentMetaInput;

  @Field(() => EventEntryCompetitionMetaInput, { nullable: true })
  competition?: EventEntryCompetitionMetaInput;
}

@InputType()
export class EventEntryUpdateInput extends PartialType(
  OmitType(EventEntry, [
    "createdAt",
    "updatedAt",
    "drawCompetition",
    "subEventCompetition",
    "drawTournament",
    "subEventTournament",
    "standing",
    "team",
    "meta",
  ] as const),
  InputType
) {
  @Field(() => EventEntryMetaInput, { nullable: true })
  meta?: EventEntryMetaInput;
}

@InputType()
export class EventEntryNewInput extends PartialType(
  OmitType(EventEntryUpdateInput, ["id"] as const),
  InputType
) {}

export interface MetaEntry {
  tournament?: EntryTournament;
  competition?: EntryCompetition;
}

export interface EntryTournament {
  place?: number;
}

export interface EntryCompetition {
  teamIndex?: number;
  players: EntryCompetitionPlayer[];
}

export interface EntryCompetitionPlayer {
  id?: string;
  single?: number;
  double?: number;
  mix?: number;
  gender?: "M" | "F";
  levelException?: boolean;
  levelExceptionRequested?: boolean;
  levelExceptionReason?: string;
  player?: Relation<Player>;
}
