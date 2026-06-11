/**
 * RankingPlace model — read-write shape for the ranking."RankingPlaces" table.
 *
 * WRITES: all creates/updates MUST go through RankingPlaceWriterService.
 * See: specs/037-ranking-write-protection/contracts/ranking-place-writer.md
 *
 * The after-hooks (RankingLastPlace propagation, GamePlayerMembership rewrites)
 * were deleted in the 037-ranking-write-protection refactor. Their behaviour now
 * lives explicitly in RankingPlaceWriterService.
 *
 * The clamp-only before-hooks below are a safety net for rogue direct writes
 * (e.g. .save() calls the eslint ban cannot see). They warn + no-op for systems
 * without configured amountOfLevels / maxDiffLevels.
 */
import { Field, ID, InputType, Int, ObjectType, OmitType, PartialType } from "@nestjs/graphql";
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
  SaveOptions,
} from "sequelize";
import {
  BeforeBulkCreate,
  BeforeCreate,
  BeforeUpdate,
  BeforeUpsert,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from "sequelize-typescript";
import { getRankingProtected } from "@badman/utils";
import { Player } from "../player.model";
import { RankingLastPlace } from "./ranking-last-place.model";
import { RankingSystem } from "./ranking-system.model";
import { Relation } from "../../wrapper";

/** Module-level cache: systemId → RankingSystem, refreshed every 5 minutes. */
const _systemCache = new Map<string, { system: RankingSystem; expiresAt: number }>();
const SYSTEM_CACHE_TTL_MS = 5 * 60 * 1000;

async function _getCachedSystem(systemId: string): Promise<RankingSystem | null> {
  const cached = _systemCache.get(systemId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.system;
  }
  const system = await RankingSystem.findByPk(systemId);
  if (system) {
    _systemCache.set(systemId, { system, expiresAt: Date.now() + SYSTEM_CACHE_TTL_MS });
  }
  return system ?? null;
}

@Table({
  timestamps: true,
  schema: "ranking",
})
@ObjectType({ description: "A RankingPlace" })
export class RankingPlace extends Model {
  constructor(values?: Partial<RankingPlace>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  override id!: string;

  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @Unique("unique_constraint")
  @Index({
    name: "ranking_index",
    using: "BTREE",
  })
  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  rankingDate?: Date;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  gender?: string;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  singlePoints?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  mixPoints?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  doublePoints?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  singlePointsDowngrade?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  mixPointsDowngrade?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  doublePointsDowngrade?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  singleRank?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  mixRank?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  doubleRank?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalSingleRanking?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalMixRanking?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalDoubleRanking?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalWithinSingleLevel?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalWithinMixLevel?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalWithinDoubleLevel?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  single?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  mix?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  double?: number;

  @Default(false)
  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  singleInactive?: boolean;
  @Default(false)
  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  mixInactive?: boolean;
  @Default(false)
  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  doubleInactive?: boolean;

  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  updatePossible?: boolean;

  @Unique("unique_constraint")
  @ForeignKey(() => Player)
  @Index({
    name: "ranking_index",
    using: "BTREE",
  })
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  playerId?: string;

  @Unique("unique_constraint")
  @ForeignKey(() => RankingSystem)
  @Index({
    name: "ranking_index",
    using: "BTREE",
  })
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  systemId?: string;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, "playerId")
  player?: Relation<Player>;

  @BelongsTo(() => RankingSystem, {
    foreignKey: "systemId",
    onDelete: "CASCADE",
  })
  rankingSystem?: Relation<RankingSystem>;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to RankingSystem
  getRankingSystem!: BelongsToGetAssociationMixin<RankingSystem>;
  setRankingSystem!: BelongsToSetAssociationMixin<RankingSystem, string>;

  // #region Clamp-only safety-net hooks
  // These hooks are NOT the enforcement path — RankingPlaceWriterService is.
  // They guard against rogue direct writes that bypass the service.
  // They warn + no-op for unconfigured systems to avoid breaking unrelated writes.

  @BeforeCreate
  @BeforeUpsert
  static async clampOnWrite(instance: RankingPlace, _options: SaveOptions): Promise<void> {
    await RankingPlace._applyClamp([instance]);
  }

  @BeforeUpdate
  static async clampOnUpdate(instance: RankingPlace, _options: SaveOptions): Promise<void> {
    await RankingPlace._applyClamp([instance]);
  }

  @BeforeBulkCreate
  static async clampOnBulkCreate(instances: RankingPlace[], _options: SaveOptions): Promise<void> {
    await RankingPlace._applyClamp(instances);
  }

  private static async _applyClamp(instances: RankingPlace[]): Promise<void> {
    // Group by systemId to batch cache lookups
    const systemIds = [...new Set(instances.map((i) => i.systemId).filter(Boolean))] as string[];

    for (const systemId of systemIds) {
      let system: RankingSystem | null;
      try {
        system = await _getCachedSystem(systemId);
      } catch {
        console.warn(
          `[RankingPlace] clamp hook: failed to load system ${systemId} — skipping clamp`
        );
        continue;
      }

      if (!system || system.amountOfLevels == null || system.maxDiffLevels == null) {
        console.warn(
          `[RankingPlace] clamp hook: system ${systemId} is unconfigured (missing amountOfLevels or maxDiffLevels) — skipping clamp`
        );
        continue;
      }

      for (const inst of instances.filter((i) => i.systemId === systemId)) {
        try {
          const protected_ = getRankingProtected(
            { single: inst.single, double: inst.double, mix: inst.mix },
            system
          );
          inst.single = protected_.single;
          inst.double = protected_.double;
          inst.mix = protected_.mix;
        } catch {
          // getRankingProtected throws for missing config — already guarded above
        }
      }
    }
  }

  // #endregion

  asLastRankingPlace() {
    return {
      rankingDate: this.rankingDate,
      singlePoints: this.singlePoints,
      mixPoints: this.mixPoints,
      gender: this.gender,
      doublePoints: this.doublePoints,
      singlePointsDowngrade: this.singlePointsDowngrade,
      mixPointsDowngrade: this.mixPointsDowngrade,
      doublePointsDowngrade: this.doublePointsDowngrade,
      singleRank: this.singleRank,
      mixRank: this.mixRank,
      doubleRank: this.doubleRank,
      totalSingleRanking: this.totalSingleRanking,
      totalMixRanking: this.totalMixRanking,
      totalDoubleRanking: this.totalDoubleRanking,
      totalWithinSingleLevel: this.totalWithinSingleLevel,
      totalWithinMixLevel: this.totalWithinMixLevel,
      totalWithinDoubleLevel: this.totalWithinDoubleLevel,
      single: this.single,
      mix: this.mix,
      double: this.double,
      singleInactive: this.singleInactive,
      mixInactive: this.mixInactive,
      doubleInactive: this.doubleInactive,
      playerId: this.playerId,
      systemId: this.systemId,
    } as Partial<RankingLastPlace>;
  }
}

@InputType()
export class RankingPlaceUpdateInput extends PartialType(
  OmitType(RankingPlace, ["createdAt", "updatedAt", "player", "rankingSystem"] as const),
  InputType
) {}

@InputType()
export class RankingPlaceNewInput extends PartialType(
  OmitType(RankingPlaceUpdateInput, ["id"] as const),
  InputType
) {}
