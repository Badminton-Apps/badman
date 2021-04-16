import { BuildOptions, SaveOptions } from 'sequelize';
import {
  AfterBulkCreate,
  AfterCreate,
  AfterUpdate,
  AllowNull,
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
import { DataBaseHandler } from '../../database';
import { logger } from '../../utils';
import { ClubMembership } from './club-membership.model';
import { Club } from './club.model';
import { Player } from './player.model';
import { Team } from './team.model';

@Table({
  schema: 'public'
})
export class TeamPlayerMembership extends Model {
  constructor(values?: Partial<TeamPlayerMembership>, options?: BuildOptions) {
    super(values, options);
  }

  @ForeignKey(() => Player)
  @AllowNull(false)
  @Index('player_team_index')
  @Column
  playerId: string;

  @ForeignKey(() => Team)
  @AllowNull(false)
  @Index('player_team_index')
  @Column
  teamId: string;

  @Column
  end?: Date;

  @AllowNull(false)
  @Default(false)
  @Column
  base: boolean;

  // Below is a hacky way to make the Unique across FK's + start
  // issue: (https://github.com/sequelize/sequelize/issues/12988)
  @Unique('TeamPlayerMemberships_teamId_playerId_unique')
  @AllowNull(false)
  @Column
  start: Date;

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @AfterCreate
  static async checkIfPlayerIsInClub(
    instance: TeamPlayerMembership,
    options: SaveOptions
  ) {
    logger.debug('Are the hooks running?')

    const team = await Team.findByPk(instance.teamId, {
      transaction: options.transaction
    });
    const connection = await ClubMembership.findOne({
      order: [['end', 'desc']],
      where: { playerId: instance.playerId },
      transaction: options.transaction
    });
    if (!connection) {
      // create new
      await new ClubMembership({
        clubId: team.clubId,
        playerId: instance.playerId,
        start: new Date()
      }).save({ transaction: options.transaction });
    } else {
      if (connection.clubId !== team.clubId) {
        // Terminate last
        const now = new Date();
        connection.end = now;
        connection.save({ transaction: options.transaction });

        // Create new
        await new ClubMembership({
          clubId: team.clubId,
          playerId: instance.playerId,
          start: new Date()
        }).save({ transaction: options.transaction });
      }
    }
  }

  @AfterBulkCreate
  static async checkIfPlayersIsInClub(
    instances: TeamPlayerMembership[],
    options: SaveOptions
  ) {
    for (const team of instances) {
      await this.checkIfPlayerIsInClub(team, options);
    }
  }
}
