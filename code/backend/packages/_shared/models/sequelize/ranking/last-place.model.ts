import {
  BeforeBulkCreate,
  BeforeCreate,
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
  Unique
} from 'sequelize-typescript';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
  Op,
  SaveOptions
} from 'sequelize';
import { Player } from '../player.model';
import { Game } from '../../sequelize';
import { RankingSystem } from './system.model';
import { RankingPlace } from './place.model';
import moment from 'moment';
import { GameType } from '../../enums';

@Table({
  timestamps: true,
  tableName: 'LastPlaces',
  schema: 'ranking'
})
export class LastRankingPlace extends Model {
  constructor(values?: Partial<LastRankingPlace>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  rankingDate: Date;

  @Column
  singlePoints: number;
  @Column
  mixPoints: number;
  @Column
  doublePoints: number;

  @Column
  singlePointsDowngrade: number;
  @Column
  mixPointsDowngrade: number;
  @Column
  doublePointsDowngrade: number;

  @Column
  singleRank: number;
  @Column
  mixRank: number;
  @Column
  doubleRank: number;

  @Column
  totalSingleRanking: number;
  @Column
  totalMixRanking: number;
  @Column
  totalDoubleRanking: number;

  @Column
  totalWithinSingleLevel: number;
  @Column
  totalWithinMixLevel: number;
  @Column
  totalWithinDoubleLevel: number;

  @Column
  single: number;
  @Column
  mix: number;
  @Column
  double: number;

  @Default(false)
  @Column
  singleInactive: boolean;
  @Default(false)
  @Column
  mixInactive: boolean;
  @Default(false)
  @Column
  doubleInactive: boolean;

  @Unique('unique_constraint')
  @ForeignKey(() => Player)
  @Index('lastPlaces_ranking_index')
  @Column
  playerId: string;

  @Unique('unique_constraint')
  @ForeignKey(() => RankingSystem)
  @Column
  systemId: string;

  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @BelongsTo(() => RankingSystem, {
    foreignKey: 'systemId',
    onDelete: 'CASCADE'
  })
  rankingSystem: RankingSystem;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to RankingSystem
  getRankingSystem!: BelongsToGetAssociationMixin<RankingSystem>;
  setRankingSystem!: BelongsToSetAssociationMixin<RankingSystem, string>;

  @BeforeBulkCreate
  static async fillNullValues(
    instances: LastRankingPlace[],
    options: SaveOptions
  ) {
    const singleNullInstances = instances.filter(
      instance => instance.single === null
    );
    const doubleNullInstances = instances.filter(
      instance => instance.double === null
    );
    const mixNullInstances = instances.filter(
      instance => instance.mix === null
    );

    const systemDisintct = instances.filter(
      (value, index, self) =>
        self.findIndex(m => m.systemId === value.systemId) === index
    );

    const systems = await RankingSystem.findAll({
      where: {
        id: {
          [Op.in]: systemDisintct.map(instance => instance.systemId)
        }
      },
      transaction: options.transaction
    });

    for (const instance of singleNullInstances) {
      const system = systems.find(r => r.id === instance.systemId);
      const place = await RankingPlace.findOne({
        where: {
          SystemId: instance.systemId,
          playerId: instance.playerId,
          single: {
            [Op.not]: null
          },
          rankingDate: {
            [Op.lt]: instance.rankingDate
          }
        },
        order: [['rankingDate', 'DESC']],
        transaction: options.transaction
      });

      const player = await Player.findByPk(instance.playerId, {
        include: [
          {
            required: false,
            model: Game,
            where: {
              gameType: GameType.S,
              playedAt: {
                [Op.gte]: moment(instance.rankingDate)
                  .add(system.inactivityAmount, system.inactivityUnit)
                  .toDate()
              }
            }
          }
        ],
        transaction: options.transaction
      });

      instance.single = place?.single;
      instance.singleInactive =
        (player.games?.length ?? 0) < system.gamesForInactivty;
    }

    for (const instance of doubleNullInstances) {
      const system = systems.find(r => r.id === instance.systemId);
      const place = await RankingPlace.findOne({
        where: {
          SystemId: instance.systemId,
          playerId: instance.playerId,
          double: {
            [Op.not]: null
          },
          rankingDate: {
            [Op.gt]: instance.rankingDate
          }
        },
        order: [['rankingDate', 'DESC']],
        transaction: options.transaction
      });

      const player = await Player.findByPk(instance.playerId, {
        include: [
          {
            required: false,
            model: Game,
            where: {
              gameType: GameType.D,
              playedAt: {
                [Op.gte]: moment(instance.rankingDate)
                  .add(system.inactivityAmount, system.inactivityUnit)
                  .toDate()
              }
            }
          }
        ],
        transaction: options.transaction
      });

      instance.double = place?.double;
      instance.doubleInactive =
        (player.games?.length ?? 0) < system.gamesForInactivty;
    }

    for (const instance of mixNullInstances) {
      const system = systems.find(r => r.id === instance.systemId);
      const place = await RankingPlace.findOne({
        where: {
          SystemId: instance.systemId,
          playerId: instance.playerId,
          mix: {
            [Op.not]: null
          },
          rankingDate: {
            [Op.gt]: instance.rankingDate
          }
        },
        order: [['rankingDate', 'DESC']],
        transaction: options.transaction
      });

      const player = await Player.findByPk(instance.playerId, {
        include: [
          {
            required: false,
            model: Game,
            where: {
              gameType: GameType.MX,
              playedAt: {
                [Op.gte]: moment(instance.rankingDate)
                  .add(system.inactivityAmount, system.inactivityUnit)
                  .toDate()
              }
            }
          }
        ],
        transaction: options.transaction
      });

      instance.mix = place?.mix;
      instance.mixInactive =
        (player.games?.length ?? 0) < system.gamesForInactivty;
    }
  }

  @BeforeCreate
  static async fillNullValue(instance: LastRankingPlace, options: SaveOptions) {
    return this.fillNullValues([instance], options);
  }
}
