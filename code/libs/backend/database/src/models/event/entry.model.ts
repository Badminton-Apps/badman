import { NotFoundException } from '@nestjs/common';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import moment from 'moment';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin,
  Op,
  SaveOptions,
} from 'sequelize';
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
} from 'sequelize-typescript';
import { SubEventType } from '../../enums';
import { MetaType } from '../../types';
import { Player } from '../player.model';
import { RankingPlace, RankingSystem } from '../ranking';
import { Team } from '../team.model';
import {
  DrawCompetition,
  EventCompetition,
  SubEventCompetition,
} from './competition';
import { Standing } from './standing.model';
import { DrawTournament, SubEventTournament } from './tournament';

@Table({
  timestamps: true,
  schema: 'event',
  tableName: 'Entries',
} as TableOptions)
@ObjectType({ description: 'A EventEntry' })
export class EventEntry extends Model {
  constructor(values?: Partial<EventEntry>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @BelongsTo(() => Team, 'teamId')
  team?: Team;

  @ForeignKey(() => Team)
  @Field({ nullable: true })
  @Column
  teamId: string;

  @BelongsTo(() => Player, 'player1Id')
  player1?: Player;

  @ForeignKey(() => Player)
  @Field({ nullable: true })
  @Column
  player1Id: string;

  @BelongsTo(() => Player, 'player2Id')
  player2?: Player;

  @ForeignKey(() => Player)
  @Field({ nullable: true })
  @Column
  player2Id: string;

  @BelongsTo(() => SubEventTournament, {
    foreignKey: 'subEventId',
    constraints: false,
  })
  tournamentSubEvent: SubEventTournament;

  /**
   * Draw get's deciede upon draw
   */
  @Field(() => DrawTournament, { nullable: true })
  @BelongsTo(() => DrawTournament, {
    foreignKey: 'drawId',
    constraints: false,
  })
  tournamentDraw?: DrawTournament;

  @Field(() => SubEventCompetition, { nullable: true })
  @BelongsTo(() => SubEventCompetition, {
    foreignKey: 'subEventId',
    constraints: false,
  })
  competitionSubEvent: SubEventCompetition;

  /**
   * Draw get's deciede upon draw
   */
  @BelongsTo(() => DrawCompetition, {
    foreignKey: 'drawId',
    constraints: false,
  })
  competitionDraw?: DrawCompetition;

  @Field({ nullable: true })
  @Column
  subEventId: string;
  @Field({ nullable: true })
  @Column
  drawId: string;

  @Field({ nullable: true })
  @Column
  entryType: string;

  @HasOne(() => Standing)
  standing?: Standing;

  @Field(() => MetaType, { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  meta?: Meta;

  // Belongs to Team
  getTeam!: BelongsToGetAssociationMixin<Team>;
  setTeam!: BelongsToSetAssociationMixin<Team, string>;

  // Belongs to Player1
  getPlayer1!: BelongsToGetAssociationMixin<Player>;
  setPlayer1!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to Player2
  getPlayer2!: BelongsToGetAssociationMixin<Player>;
  setPlayer2!: BelongsToSetAssociationMixin<Player, string>;

  getPlayers() {
    if (this.player1Id && this.player2Id) {
      return Promise.all([this.getPlayer1(), this.getPlayer2()]);
    } else {
      return Promise.all([this.getPlayer1()]);
    }
  }

  // Belongs to TournamentSubEvent
  getTournamentSubEvent!: BelongsToGetAssociationMixin<SubEventTournament>;
  setTournamentSubEvent!: BelongsToSetAssociationMixin<
    SubEventTournament,
    string
  >;

  // Belongs to TournamentDraw
  getTournamentDraw!: BelongsToGetAssociationMixin<DrawTournament>;
  setTournamentDraw!: BelongsToSetAssociationMixin<DrawTournament, string>;

  // Belongs to TournamentSubEvent
  getCompetitionSubEvent!: BelongsToGetAssociationMixin<SubEventCompetition>;
  setCompetitionSubEvent!: BelongsToSetAssociationMixin<
    SubEventCompetition,
    string
  >;

  // Belongs to CompetitionDraw
  getCompetitionDraw!: BelongsToGetAssociationMixin<DrawCompetition>;
  setCompetitionDraw!: BelongsToSetAssociationMixin<DrawCompetition, string>;

  // Has one Standing
  getStanding!: HasOneGetAssociationMixin<Standing>;
  setStanding!: HasOneSetAssociationMixin<Standing, string>;

  // recalculate competition index
  @BeforeUpdate
  @BeforeCreate
  static async recalculateCompetitionIndex(
    instance: EventEntry,
    options: SaveOptions
  ) {
    if (!instance.changed('meta')) {
      return;
    }

    const dbSubEvent = await instance.getCompetitionSubEvent({
      attributes: [],
      include: [
        {
          model: EventCompetition,
          attributes: ['startYear', 'usedRankingUnit', 'usedRankingAmount'],
        },
      ],
    });
    if (!dbSubEvent) {
      throw new NotFoundException(`${SubEventCompetition.name}: event`);
    }

    const dbSystem = await RankingSystem.findOne({
      where: {
        primary: true,
      },
      transaction: options?.transaction,
    });

    if (!dbSystem) {
      throw new NotFoundException(`${RankingSystem.name}: primary`);
    }

    if (!dbSubEvent.eventCompetition) {
      throw new Error('Did not include eventCompetition');
    }

    if (!instance.meta?.competition) {
      // not a competition meta
      return;
    }

    const usedRankingDate = moment();
    usedRankingDate.set('year', dbSubEvent.eventCompetition.startYear);
    usedRankingDate.set(
      dbSubEvent.eventCompetition.usedRankingUnit,
      dbSubEvent.eventCompetition.usedRankingAmount
    );

    const startRanking = usedRankingDate.clone().set('date', 0);
    const endRanking = usedRankingDate.clone().clone().endOf('month');

    const dbRanking = await RankingPlace.findAll({
      where: {
        playerId: instance.meta?.competition?.players?.map((r) => r.id),
        systemId: dbSystem.id,
        rankingDate: {
          [Op.between]: [startRanking.toDate(), endRanking.toDate()],
        },
      },
      transaction: options?.transaction,
    });

    instance.meta.competition.players = instance.meta?.competition.players?.map(
      (r) => {
        const ranking = dbRanking.find((ranking) => ranking.playerId === r.id);
        return {
          id: r.id,
          single: ranking?.single ?? 12,
          double: ranking?.double ?? 12,
          mix: ranking?.mix ?? 12,
          gender: r.gender,
        };
      }
    );

    const team = await instance.getTeam();

    let bestPlayers = instance.meta?.competition.players;
    if (instance.meta?.competition.players?.length > 4) {
      if (team.type === SubEventType.MX) {
        const male = instance.meta?.competition.players
          .filter((p) => p.gender === 'M')
          .sort(
            (b, a) =>
              (b?.single ?? 12) +
              (b?.double ?? 12) +
              (b?.mix ?? 12) -
              ((a?.single ?? 12) + (a?.double ?? 12) + (a?.mix ?? 12))
          )
          .slice(0, 2);

        const female = instance.meta?.competition.players
          .filter((p) => p.gender === 'F')
          .sort(
            (b, a) =>
              (b?.single ?? 12) +
              (b?.double ?? 12) +
              (b?.mix ?? 12) -
              ((a?.single ?? 12) + (a?.double ?? 12) + (a?.mix ?? 12))
          )
          .slice(0, 2);
        bestPlayers = [...male, ...female];
      } else {
        bestPlayers = instance.meta?.competition.players
          .sort(
            (b, a) =>
              (b?.single ?? 12) +
              (b?.double ?? 12) -
              ((a?.single ?? 12) + (a?.double ?? 12))
          )
          .slice(0, 4);
      }
    }

    instance.meta.competition.teamIndex = Team.getIndexFromPlayers(
      team.type,
      bestPlayers.map((p) => {
        return {
          single: p.single,
          double: p.double,
          mix: p.mix,
        };
      })
    );
  }
}

export interface Meta {
  tournament?: EntryTournament;
  competition?: EntryCompetition;
}

export interface EntryTournament {
  place: number;
}

export interface EntryCompetition {
  teamIndex: number;
  players: EntryCompetitionPlayers[];
}

export interface EntryCompetitionPlayers {
  id: string;
  single: number;
  double: number;
  mix: number;
  gender: string;
}
