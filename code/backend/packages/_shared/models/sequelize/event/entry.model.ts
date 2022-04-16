import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin,
} from 'sequelize';
import {
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
import { Standing } from '.';
import { Player } from '../player.model';
import { Team } from '../team.model';
import { DrawCompetition, SubEventCompetition } from './competition';
import { DrawTournament, SubEventTournament } from './tournament';

@Table({
  timestamps: true,
  schema: 'event',
  tableName: 'Entries',
} as TableOptions)
export class EventEntry extends Model {
  constructor(values?: Partial<EventEntry>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @BelongsTo(() => Team, 'teamId')
  team?: Team;

  @ForeignKey(() => Team)
  @Column
  teamId: string;

  @BelongsTo(() => Player, 'player1Id')
  player1?: Player;

  @ForeignKey(() => Player)
  @Column
  player1Id: string;

  @BelongsTo(() => Player, 'player2Id')
  player2?: Player;

  @ForeignKey(() => Player)
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
  @BelongsTo(() => DrawTournament, {
    foreignKey: 'drawId',
    constraints: false,
  })
  tournamentDraw?: DrawTournament;

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

  @Column
  subEventId: string;
  @Column
  drawId: string;

  @Column
  entryType: string;

  @HasOne(() => Standing)
  standing?: Standing;

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

  players() {
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
