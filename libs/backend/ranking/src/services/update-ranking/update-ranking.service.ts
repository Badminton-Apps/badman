import { Player, RankingPlace } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class UpdateRankingService {
  private readonly _logger = new Logger(UpdateRankingService.name);

  constructor(private _sequelize: Sequelize) {}

  async processFileUpload(
    data: MembersRolePerGroupData[],
    options: {
      updateCompStatus?: boolean;
      removeAllRanking?: boolean;
      updateRanking?: boolean;
      updatePossible?: boolean;
      createNewPlayers?: boolean;
      rankingDate?: Date;
      rankingSystemId?: string;
    } = {
      updateCompStatus: false,
      removeAllRanking: false,
      updateRanking: false,
      updatePossible: false,
      createNewPlayers: false,
    },
  ) {
    if (!options.rankingDate) {
      throw new Error('Ranking date is required');
    } else if (!options.rankingSystemId) {
      throw new Error('Ranking system id is required');
    } else if (!data || data.length == 0) {
      throw new Error('No data to process');
    }

    // ranking date should be the start of the day
    options.rankingDate = moment(options.rankingDate).startOf('day').toDate();

    // Filter out douplicates and keep the lowest value (best)
    data = data.reduce((acc, member) => {
      const existingMember = acc.find((m) => m.memberId === member.memberId);
      if (!existingMember) {
        acc.push(member);
      } else {
        this._logger.warn(`Duplicate member found: ${member.memberId}`);
        const currentIndex = acc.indexOf(existingMember);
        // the latest startDate is the one we need
        if (moment(member.startDate).isAfter(existingMember.startDate)) {
          acc[currentIndex] = member;
        }

        // else use the lowest ranking of single, double and mixed
        if (
          Math.min(member.single, member.doubles, member.mixed) <
          Math.min(existingMember.single, existingMember.doubles, existingMember.mixed)
        ) {
          acc[currentIndex] = member;
        }
      }
      return acc;
    }, [] as MembersRolePerGroupData[]);

    const transaction = await this._sequelize.transaction();
    try {
      this._logger.log('Start processing export members role per group');
      const distinctPlayers: Player[] = [];
      const distinctIds: string[] = [];

      // fetch players from database in chunks and add them to the distinct players

      const chunks = this.chunkArray(data);

      for (const chunk of chunks) {
        // filter out distinct ids from the chunk
        const distinctChunkIds = chunk
          .map((d) => d.memberId)
          .filter((d) => !distinctIds.find((p) => p === d));

        const players = await Player.findAll({
          attributes: ['id', 'memberId', 'competitionPlayer', 'gender'],
          where: {
            memberId: distinctChunkIds,
          },
          transaction,
        });

        distinctPlayers.push(...players);
        distinctIds.push(...players.map((p) => p.memberId ?? ''));
      }

      // find all players that are not in the database
      const newPlayers = data.filter((d) => !distinctIds.find((p) => p === d.memberId));

      // Create new players
      this._logger.debug(`Create new players: ${options.createNewPlayers}`);

      if (newPlayers.length > 0 && options.createNewPlayers == true) {
        this._logger.debug(`Create ${newPlayers.length} new players`);

        const chunkSize = 100;
        const chunks = [];
        for (let i = 0; i < newPlayers.length; i += chunkSize) {
          chunks.push(newPlayers.slice(i, i + chunkSize));
        }

        let playersProcessed = 0;
        for (const chunk of chunks) {
          playersProcessed += chunk.length;
          this._logger.verbose(`Processing ${playersProcessed} of ${newPlayers.length} players`);

          await Player.bulkCreate(
            chunk?.map((newp) => {
              return {
                memberId: newp.memberId,
                firstName: newp.firstName,
                lastName: newp.lastName,
                gender: newp.gender == 'M' ? 'M' : 'F',
              } as Partial<Player>;
            }),
            { transaction },
          );
        }

        // Get all new players from the database and add them to the distinct players
        const newPlayersFromDb = await Player.findAll({
          attributes: ['id', 'memberId', 'competitionPlayer', 'gender'],
          where: {
            memberId: newPlayers.map((p) => p.memberId),
          },
          transaction,
        });

        distinctPlayers.push(...newPlayersFromDb);
      }

      // Update comp status
      this._logger.debug(`Update competition status: ${options.updateCompStatus}`);
      if (options.updateCompStatus) {
        const memberIdsComp = data
          ?.filter((p) => p.role === 'Competitiespeler')
          ?.map((d) => d.memberId);

        const newCompPlayers = await Player.findAll({
          attributes: ['id', 'memberId', 'competitionPlayer'],
          where: {
            memberId: {
              [Op.in]: memberIdsComp,
            },
            competitionPlayer: false,
          },
          transaction,
        });

        const removedCompPlayers = await Player.findAll({
          attributes: ['id', 'memberId', 'competitionPlayer'],
          where: {
            memberId: {
              [Op.notIn]: memberIdsComp,
            },
            competitionPlayer: true,
          },
          transaction,
        });

        await this.setCompetitionStatus(
          newCompPlayers.map((p) => p.id),
          true,
          transaction,
        );
        await this.setCompetitionStatus(
          removedCompPlayers.map((p) => p.id),
          false,
          transaction,
        );
      }

      // Remove all ranking
      this._logger.debug(`Remove all ranking: ${options.removeAllRanking}`);
      if (options.removeAllRanking) {
        await RankingPlace.destroy({
          where: {
            playerId: distinctPlayers.map((p) => p.id) ?? [],
            rankingDate: options.rankingDate,
            systemId: options.rankingSystemId,
          },
          transaction,
        });
      }

      // Update ranking
      this._logger.debug(`Update ranking: ${options.updateRanking}`);

      if (options.updateRanking) {
        const distinctPlayersChunks = this.chunkArray(distinctPlayers, 100);

        for (const chunk of distinctPlayersChunks) {
          const places = await RankingPlace.findAll({
            attributes: [
              'id',
              'playerId',
              'systemId',
              'rankingDate',
              'single',
              'singlePoints',
              'double',
              'doublePoints',
              'mix',
              'mixPoints',
            ],
            where: {
              playerId: chunk?.map((p) => p.id) ?? [],
              rankingDate: options.rankingDate,
              systemId: options.rankingSystemId,
            },
            transaction,
          });

          this._logger.debug(`Found ${places.length} places`);
          const toUpdate: RankingPlace[] = [];

          for (const d of data) {
            const player = chunk.find((p) => p.memberId === d.memberId);
            if (!player) {
              continue;
            }
            let place = places.find((p) => p?.playerId === player.id);

            if (!place) {
              if (!options.removeAllRanking) {
                this._logger.verbose(`Create new ranking place for player: ${player.id}`);
              }

              place = new RankingPlace();
              place.playerId = player.id;
              place.rankingDate = options.rankingDate;
              place.systemId = options.rankingSystemId;
            }

            place.single = d.single || place.single;
            place.singlePoints = d.singlePoints || place.singlePoints;
            place.double = d.doubles || place.double;
            place.doublePoints = d.doublesPoints || place.doublePoints;
            place.mix = d.mixed || place.mix;
            place.mixPoints = d.mixedPoints || place.mixPoints;
            place.updatePossible = options.updatePossible;

            if (place.changed() != false) {
              this._logger.verbose(`Update ranking place for player: ${player.id}`);
              toUpdate.push(place);
            }
          }

          this._logger.debug(`Update ${toUpdate.length} places`);

          await RankingPlace.bulkCreate(
            toUpdate?.map((p) => p.toJSON()),
            {
              updateOnDuplicate: [
                'single',
                'double',
                'mix',
                'singlePoints',
                'doublePoints',
                'mixPoints',
                'updatePossible',
              ],
              transaction,
            },
          );
        }
      }

      // update player gender
      const memberIdsMale = data?.filter((p) => p.gender === 'M')?.map((d) => d.memberId);
      const memberIdsFemale = data?.filter((p) => p.gender === 'V')?.map((d) => d.memberId);

      const malePlayers = await Player.findAll({
        attributes: ['id', 'memberId', 'gender'],
        where: {
          memberId: memberIdsMale,
          gender: 'F',
        },
        transaction,
      });

      const femalePlayers = await Player.findAll({
        attributes: ['id', 'memberId', 'gender'],
        where: {
          memberId: memberIdsFemale,
          gender: 'M',
        },
        transaction,
      });

      await this.setGender(
        malePlayers.map((p) => p.id),
        'M',
        transaction,
      );
      await this.setGender(
        femalePlayers.map((p) => p.id),
        'F',
        transaction,
      );

      this._logger.debug('Commit transaction');
      await transaction.commit();
      this._logger.log('End processing export members role per group');
    } catch (error) {
      this._logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  private chunkArray<T>(data: T[], chunkSize = 100) {
    const chunks = [] as T[][];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // set competition status
  async setCompetitionStatus(id: string[], status: boolean, transaction?: Transaction) {
    transaction = transaction || (await this._sequelize.transaction());

    this._logger.verbose(`Set competition status: ${status}, amount: ${id.length}`);

    if (id.length === 0) {
      return;
    }

    await Player.update(
      {
        competitionPlayer: status,
      },
      {
        where: {
          id: id,
        },
        transaction,
      },
    );
  }

  // set gender
  async setGender(id: string[], gender: 'M' | 'F', transaction?: Transaction) {
    transaction = transaction || (await this._sequelize.transaction());

    this._logger.verbose(`Set gender to: ${gender}, amount: ${id.length}`);

    if (id.length === 0) {
      return;
    }

    await Player.update(
      {
        gender,
      },
      {
        where: {
          id: id,
        },
        transaction,
      },
    );
  }
}

export interface MembersRolePerGroupData {
  memberId: string;
  startDate: string;
  firstName: string;
  lastName: string;
  role: string;
  gender: 'M' | 'V';
  single: number;
  singlePoints: number;
  doubles: number;
  doublesPoints: number;
  mixed: number;
  mixedPoints: number;
}
