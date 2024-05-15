import { Club, ClubPlayerMembership, Player, RankingPlace } from '@badman/backend-database';
import { ClubMembershipType } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { IncludeOptions, Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class UpdateRankingService {
  private readonly _logger = new Logger(UpdateRankingService.name);

  constructor(private _sequelize: Sequelize) {}

  async processFileUpload(
    data: MembersRolePerGroupData[],
    input: Partial<Options> = {
      updateCompStatus: false,
      removeAllRanking: false,
      updateRanking: false,
      updatePossible: false,
      updateClubs: false,
      createNewPlayers: false,
    },
  ) {
    const options = this.validateOptions(input, data);

    options.rankingDate = moment(options.rankingDate).startOf('day').toDate();

    const transaction = await this._sequelize.transaction();
    try {
      this._logger.log('Start processing export members role per group');

      const distinctPlayers = await this.fetchDistinctPlayers(
        data,
        options.rankingDate,
        options.updateClubs,
        transaction,
      );
      const newPlayers = this.getNewPlayers(data, distinctPlayers);

      if (newPlayers.length > 0 && options.createNewPlayers) {
        await this.createPlayers(newPlayers, transaction);
        const newPlayersFromDb = await this.getNewPlayersFromDb(newPlayers, transaction);
        distinctPlayers.push(...newPlayersFromDb);
      }

      if (options.updateCompStatus) {
        await this.updateCompetitionStatus(data, transaction);
      }

      if (options.updateClubs) {
        await this.updateClubs(
          data,
          distinctPlayers,
          options.clubMembershipEndDate,
          options.clubMembershipStartDate,
          transaction,
        );
      }

      if (options.removeAllRanking) {
        await this.removeRanking(
          distinctPlayers,
          options.rankingDate,
          options.rankingSystemId,
          transaction,
        );
      }

      if (options.updateRanking) {
        await this.updateRanking(
          data,
          distinctPlayers,
          options.rankingDate,
          options.rankingSystemId,
          options.removeAllRanking,
          options.updatePossible,
          transaction,
        );
      }

      await this.updatePlayerGender(data, transaction);

      this._logger.debug('Commit transaction');
      await transaction.commit();
      this._logger.log('End processing export members role per group');
    } catch (error) {
      this._logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  private validateOptions(options: Partial<Options>, data: MembersRolePerGroupData[]) {
    if (!options.rankingDate) {
      throw new Error('Ranking date is required');
    }
    if (!options.rankingSystemId) {
      throw new Error('Ranking system id is required');
    }
    if (!data || data.length == 0) {
      throw new Error('No data to process');
    }

    if (options.updateClubs && !options.clubMembershipStartDate && !options.clubMembershipEndDate) {
      throw new Error('Club membership start and end date are required');
    }

    return options as Options;
  }

  private async fetchDistinctPlayers(
    data: MembersRolePerGroupData[],
    rankingDate: Date,
    updateClubs: boolean,
    transaction?: Transaction,
  ): Promise<Player[]> {
    const distinctPlayers: Player[] = [];
    const distinctIds: string[] = [];

    const chunks = this.chunkArray(data);

    const include = (
      updateClubs
        ? [
            {
              model: Club,
              attributes: ['id', 'name', 'fullName'],
              required: false,
              through: {
                attributes: ['id', 'active', 'end', 'start', 'confirmed'],
                where: {
                  [Op.or]: [{ end: null }, { start: { [Op.lte]: rankingDate } }],
                },
              },
            },
          ]
        : []
    ) as IncludeOptions;

    for (const chunk of chunks) {
      const distinctChunkIds = chunk
        .map((d) => d.memberId)
        .filter((d) => !distinctIds.find((p) => p === d));

      const players = await Player.findAll({
        attributes: ['id', 'memberId', 'competitionPlayer', 'gender'],
        where: {
          memberId: distinctChunkIds,
        },
        include,
        transaction,
      });

      distinctPlayers.push(...players);
      distinctIds.push(...players.map((p) => p.memberId ?? ''));
    }

    return distinctPlayers;
  }

  private getNewPlayers(
    data: MembersRolePerGroupData[],
    distinctPlayers: Player[],
  ): MembersRolePerGroupData[] {
    return data.filter((d) => !distinctPlayers.find((p) => p.memberId === d.memberId));
  }

  private async createPlayers(newPlayers: MembersRolePerGroupData[], transaction?: Transaction) {
    const chunkSize = 100;
    const chunks = this.chunkArray(newPlayers, chunkSize);

    let playersProcessed = 0;
    for (const chunk of chunks) {
      playersProcessed += chunk.length;
      this._logger.verbose(`Processing ${playersProcessed} of ${newPlayers.length} players`);

      await Player.bulkCreate(
        chunk.map((newp) => {
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
  }

  private async getNewPlayersFromDb(
    newPlayers: MembersRolePerGroupData[],
    transaction?: Transaction,
  ): Promise<Player[]> {
    return Player.findAll({
      attributes: ['id', 'memberId', 'competitionPlayer', 'gender'],
      where: {
        memberId: newPlayers.map((p) => p.memberId),
      },
      transaction,
    });
  }

  private async updateCompetitionStatus(
    data: MembersRolePerGroupData[],
    transaction?: Transaction,
  ) {
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

  private async removeRanking(
    distinctPlayers: Player[],
    rankingDate: Date,
    rankingSystemId: string,
    transaction?: Transaction,
  ) {
    await RankingPlace.destroy({
      where: {
        playerId: distinctPlayers.map((p) => p.id) ?? [],
        rankingDate,
        systemId: rankingSystemId,
      },
      transaction,
    });
  }

  private async updateRanking(
    data: MembersRolePerGroupData[],
    distinctPlayers: Player[],
    rankingDate: Date,
    rankingSystemId: string,
    removeAllRanking: boolean,
    updatePossible: boolean,
    transaction?: Transaction,
  ) {
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
          rankingDate,
          systemId: rankingSystemId,
        },
        transaction,
      });

      const toUpdate: RankingPlace[] = [];

      for (const d of data) {
        const player = chunk.find((p) => p.memberId === d.memberId);
        if (!player) {
          continue;
        }
        let place = places.find((p) => p?.playerId === player.id);

        if (!place) {
          if (!removeAllRanking) {
            this._logger.verbose(`Create new ranking place for player: ${player.id}`);
          }

          place = new RankingPlace();
          place.playerId = player.id;
          place.rankingDate = rankingDate;
          place.systemId = rankingSystemId;
        }

        place.single = d.single || place.single;
        place.singlePoints = d.singlePoints || place.singlePoints;
        place.double = d.doubles || place.double;
        place.doublePoints = d.doublesPoints || place.doublePoints;
        place.mix = d.mixed || place.mix;
        place.mixPoints = d.mixedPoints || place.mixPoints;
        place.updatePossible = updatePossible;

        if (place.changed() != false) {
          this._logger.verbose(`Update ranking place for player: ${player.id}`);
          toUpdate.push(place);
        }
      }

      await RankingPlace.bulkCreate(
        toUpdate.map((p) => p.toJSON()),
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

  private async updateClubs(
    data: MembersRolePerGroupData[],
    players: Player[],
    clubMembershipEndDate: Date,
    clubMembershipStartDate: Date,
    transaction?: Transaction,
  ) {
    const clubs = await Club.findAll({
      attributes: ['id', 'name', 'fullName'],
      transaction,
    });
    const changes = [] as {
      playerId: string;
      clubMembershipId: string;
      name: string;
      currentClub: string;
      newClub: string;
      exportClub: string;
      clubId: string;
      newClubId: string;
    }[];

    const hasMembership = [] as string[];

    data.forEach((row) => {
      const club = clubs.find(
        (c) =>
          c.name?.toLowerCase() === row.clubName?.toLowerCase() ||
          c.fullName?.toLowerCase() === row.clubName?.toLowerCase(),
      );

      const player = players.find((p) => p.memberId === row.memberId);

      if (player) {
        hasMembership.push(player.id);

        if (club) {
          const activeClub = player.clubs?.find((c) => c.ClubPlayerMembership?.active);

          if (activeClub?.id !== club.id) {
            changes.push({
              playerId: player.id,
              clubMembershipId: activeClub?.ClubPlayerMembership.id ?? '',
              name: player.fullName,
              currentClub: activeClub?.name ?? '',
              newClub: club.name ?? '',
              exportClub: row.clubName,
              clubId: activeClub?.id ?? '',
              newClubId: club.id,
            });
          }
        }
      }
    });

    await this.updatePlayerClubs(
      changes,
      clubMembershipEndDate,
      clubMembershipStartDate,
      transaction,
    );

    // end all memberships that are not in the list
    const [changed] = await ClubPlayerMembership.update(
      {
        end: clubMembershipEndDate,
      },
      {
        where: {
          playerId: {
            [Op.notIn]: hasMembership,
          },
        },
        transaction,
      },
    );

    this._logger.verbose(`${changed} no more active players`);
  }

  private async updatePlayerGender(data: MembersRolePerGroupData[], transaction?: Transaction) {
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
  }

  private async updatePlayerClubs(
    changes: {
      clubMembershipId: string;
      playerId: string;
      name: string;
      currentClub: string;
      newClub: string;
      exportClub: string;
      clubId: string;
      newClubId: string;
    }[],
    clubMembershipEndDate: Date,
    clubMembershipStartDate: Date,
    transaction?: Transaction,
  ) {
    // disble current memberships
    const toStop = changes
      ?.filter(
        (c) => c.clubId != undefined && c.clubMembershipId != undefined && c.clubMembershipId != '',
      )
      .map((c) => c.clubMembershipId) as string[];

    this._logger.verbose(`Stop ${toStop.length} memberships`);

    if (toStop.length > 0) {
      const chunks = this.chunkArray(toStop, 100);
      for (const chunk of chunks) {
        await ClubPlayerMembership.update(
          {
            end: clubMembershipEndDate,
          },
          {
            where: {
              id: chunk,
            },
            transaction,
          },
        );
      }
    }

    // create new memberships
    const toCreate = changes
      ?.filter((c) => c.newClubId != undefined && c.playerId != undefined)
      .map((c) => {
        return {
          playerId: c.playerId,
          clubId: c.newClubId,
          end: null,
          start: clubMembershipStartDate,
          confirmed: true,
          membershipType: ClubMembershipType.NORMAL,
        } as ClubPlayerMembership;
      });

    this._logger.verbose(`Create ${toCreate.length} memberships`);

    if (toCreate.length > 0) {
      const chunks = this.chunkArray(toCreate, 100);
      for (const chunk of chunks) {
        await ClubPlayerMembership.bulkCreate(chunk, { transaction });
      }
    }
  }

  private async setCompetitionStatus(id: string[], status: boolean, transaction?: Transaction) {
    transaction = transaction || (await this._sequelize.transaction());

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

  private async setGender(id: string[], gender: 'M' | 'F', transaction?: Transaction) {
    transaction = transaction || (await this._sequelize.transaction());

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

  private chunkArray<T>(data: T[], chunkSize = 100) {
    const chunks = [] as T[][];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
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
  clubName: string;
}

type Options = {
  updateCompStatus: boolean;
  updateRanking: boolean;
  updatePossible: boolean;
  updateClubs: boolean;
  removeAllRanking: boolean;
  createNewPlayers: boolean;
  rankingDate: Date;
  rankingSystemId: string;
  clubMembershipStartDate: Date;
  clubMembershipEndDate: Date;
};
