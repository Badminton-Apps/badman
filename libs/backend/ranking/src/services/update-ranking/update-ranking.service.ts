import { Club, ClubPlayerMembership, Player, RankingPlace } from "@badman/backend-database";
import { ClubMembershipType } from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import moment, { Moment } from "moment";
import { InferCreationAttributes, Op, Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

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
    }
  ) {
    const options = this.validateOptions(input, data);

    options.rankingDate = moment(options.rankingDate).startOf("day").toDate();

    const transaction = await this._sequelize.transaction();
    try {
      this._logger.log("Start processing export members role per group");

      const distinctPlayers = await this.fetchDistinctPlayers(data, transaction);
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
        await this.updateClubs(data, distinctPlayers, transaction);
      }

      if (options.removeAllRanking) {
        await this.removeRanking(
          distinctPlayers,
          options.rankingDate,
          options.rankingSystemId,
          transaction
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
          transaction
        );
      }

      await this.updatePlayerGender(data, transaction);

      this._logger.debug("Commit transaction");
      await transaction.commit();
      this._logger.log("End processing export members role per group");
    } catch (error) {
      this._logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  private validateOptions(options: Partial<Options>, data: MembersRolePerGroupData[]) {
    if (!options.rankingDate) {
      throw new Error("Ranking date is required");
    }
    if (!options.rankingSystemId) {
      throw new Error("Ranking system id is required");
    }
    if (!data || data.length == 0) {
      throw new Error("No data to process");
    }

    return options as Options;
  }

  private async fetchDistinctPlayers(
    data: MembersRolePerGroupData[],
    transaction?: Transaction
  ): Promise<Player[]> {
    const distinctPlayers: Player[] = [];
    const distinctIds: string[] = [];

    const chunks = this.chunkArray(data, 50);

    for (const chunk of chunks) {
      const distinctChunkIds = chunk
        .map((d) => d.memberId)
        .filter((d) => !distinctIds.find((p) => p === d));

      const players = await Player.findAll({
        attributes: ["id", "memberId", "competitionPlayer", "gender", "firstName", "lastName"],
        where: {
          memberId: distinctChunkIds,
        },
        transaction,
      });

      distinctPlayers.push(...players);
      distinctIds.push(...players.map((p) => p.memberId ?? ""));
    }

    return distinctPlayers;
  }

  private getNewPlayers(
    data: MembersRolePerGroupData[],
    distinctPlayers: Player[]
  ): MembersRolePerGroupData[] {
    return data.filter((d) => !distinctPlayers.find((p) => p.memberId === d.memberId));
  }

  private async createPlayers(newPlayers: MembersRolePerGroupData[], transaction?: Transaction) {
    const chunks = this.chunkArray(newPlayers, 50);

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
            gender: newp.gender == "M" ? "M" : "F",
          } as Partial<Player>;
        }),
        { transaction }
      );
    }
  }

  private async getNewPlayersFromDb(
    newPlayers: MembersRolePerGroupData[],
    transaction?: Transaction
  ): Promise<Player[]> {
    return Player.findAll({
      attributes: ["id", "memberId", "competitionPlayer", "gender"],
      where: {
        memberId: newPlayers.map((p) => p.memberId),
      },
      transaction,
    });
  }

  private async updateCompetitionStatus(
    data: MembersRolePerGroupData[],
    transaction?: Transaction
  ) {
    const memberIdsComp = data
      ?.filter((p) => p.role === "Competitiespeler")
      ?.map((d) => d.memberId);

    const newCompPlayers = await Player.findAll({
      attributes: ["id", "memberId", "competitionPlayer"],
      where: {
        memberId: {
          [Op.in]: memberIdsComp,
        },
        competitionPlayer: false,
      },
      transaction,
    });

    const removedCompPlayers = await Player.findAll({
      attributes: ["id", "memberId", "competitionPlayer"],
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
      transaction
    );
    await this.setCompetitionStatus(
      removedCompPlayers.map((p) => p.id),
      false,
      transaction
    );
  }

  private async removeRanking(
    distinctPlayers: Player[],
    rankingDate: Date,
    rankingSystemId: string,
    transaction?: Transaction
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
    transaction?: Transaction
  ) {
    const distinctPlayersChunks = this.chunkArray(distinctPlayers, 50);

    for (const chunk of distinctPlayersChunks) {
      const places = await RankingPlace.findAll({
        attributes: [
          "id",
          "playerId",
          "systemId",
          "rankingDate",
          "single",
          "singlePoints",
          "double",
          "doublePoints",
          "mix",
          "mixPoints",
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
        place.updatePossible = place.updatePossible ? true : updatePossible;

        if (place.changed() != false) {
          this._logger.verbose(`Update ranking place for player: ${player.id}`);
          toUpdate.push(place);
        }
      }

      await RankingPlace.bulkCreate(
        toUpdate.map((p) => p.toJSON()),
        {
          updateOnDuplicate: [
            "single",
            "double",
            "mix",
            "singlePoints",
            "doublePoints",
            "mixPoints",
            "updatePossible",
          ],
          transaction,
        }
      );
    }
  }

  private async updateClubs(
    data: MembersRolePerGroupData[],
    players: Player[],
    transaction?: Transaction
  ) {
    const clubs = await Club.findAll({
      attributes: ["id", "name", "fullName"],
      transaction,
    });
    const newClubMemberships: InferCreationAttributes<ClubPlayerMembership>[] = [];
    const processedPlayers = new Set<string>();

    for (const row of data) {
      // print progress every 100 players
      if (processedPlayers.size % 1000 === 0) {
        const percentage = Math.round((processedPlayers.size / data.length) * 100);
        this._logger.verbose(
          `Processed ${processedPlayers.size}/${data.length} (${percentage}%) players`
        );
      }

      const player = players.find((p) => p.memberId === row.memberId);

      if (player) {
        if (processedPlayers.has(player.id)) {
          this._logger.warn(`Player ${row.memberId} already processed`);
          continue;
        }

        const club = clubs.find(
          (c) =>
            c.name?.toLowerCase() === row.clubName?.toLowerCase() ||
            c.fullName?.toLowerCase() === row.clubName?.toLowerCase()
        );
        if (club) {
          const playerClubs = (await player.getClubs({
            include: [
              {
                model: ClubPlayerMembership,
                as: "ClubPlayerMembership",
                where: { membershipType: ClubMembershipType.NORMAL },
                order: [["start", "DESC"]],
              },
            ],
          })) as (Club & { ClubPlayerMembership: ClubPlayerMembership })[];

          // find the expected club
          const activeClub = playerClubs.find(
            (c) => c.id === club.id && c.ClubPlayerMembership.end === null
          );
          const inputStartDate = moment(row.startdate);

          if (activeClub?.id) {
            // if the player has multiple memberships with the same clubId, remove all but one
            if (
              playerClubs.filter((c) => c.id === club.id && c.ClubPlayerMembership.end == null)
                .length > 1
            ) {
              for (const otherClub of playerClubs.filter(
                (c) =>
                  c.id === club.id &&
                  c.ClubPlayerMembership.id !== activeClub.ClubPlayerMembership.id
              )) {
                await otherClub.ClubPlayerMembership.destroy({ transaction });
              }
            }

            // check if the club is the same club
            if (activeClub?.id === club.id) {
              if (!inputStartDate.isSame(activeClub.ClubPlayerMembership.start, "day")) {
                activeClub.ClubPlayerMembership.start = inputStartDate.toDate();
                await activeClub.ClubPlayerMembership.save({ transaction });
              }
            } else {
              const newMembership = await this.createClubMembership(
                playerClubs,
                player.id,
                club.id,
                inputStartDate,
                transaction
              );

              if (newMembership) {
                newClubMemberships.push(newMembership);
              }
            }

            // end other club membership(s)
            for (const otherClub of playerClubs.filter(
              (c) => c.id !== club.id && c.ClubPlayerMembership.end == null
            )) {
              otherClub.ClubPlayerMembership.end = inputStartDate.subtract(1, "day").toDate();
              await otherClub.ClubPlayerMembership.save({ transaction });
            }
          } else {
            const newMembership = await this.createClubMembership(
              playerClubs,
              player.id,
              club.id,
              inputStartDate,
              transaction
            );

            if (newMembership) {
              newClubMemberships.push(newMembership);
            }
          }
        } else {
          this._logger.warn(`Club ${row.clubName} not found for player: ${player.id}`);
        }
        processedPlayers.add(player.id);
      }
    }

    await ClubPlayerMembership.bulkCreate(newClubMemberships, { transaction });
  }

  private async createClubMembership(
    playerClubs: (Club & { ClubPlayerMembership: ClubPlayerMembership })[],
    playerId: string,
    clubId: string,
    inputStartDate: Moment,
    transaction?: Transaction
  ) {
    // check if the player has a membership with the same clubId that starts on the same date
    const existingClub = playerClubs.find(
      (c) => c.id === clubId && inputStartDate.isSame(c.ClubPlayerMembership.start, "day")
    );

    if (existingClub) {
      // activate the existing club membership
      existingClub.ClubPlayerMembership.end = null;
      await existingClub.ClubPlayerMembership.save({ transaction });
      return null;
    } else {
      // create a new club membership
      return {
        playerId: playerId,
        clubId: clubId,
        start: inputStartDate.toDate(),
        membershipType: ClubMembershipType.NORMAL,
      } as InferCreationAttributes<ClubPlayerMembership>;
    }
  }

  private async updatePlayerGender(data: MembersRolePerGroupData[], transaction?: Transaction) {
    const memberIdsMale = data?.filter((p) => p.gender === "M")?.map((d) => d.memberId);
    const memberIdsFemale = data?.filter((p) => p.gender === "V")?.map((d) => d.memberId);

    const wrongMalePlayers = await Player.findAll({
      attributes: ["id", "memberId", "gender"],
      where: {
        memberId: memberIdsMale,
        gender: {
          [Op.not]: "M",
        },
      },
      transaction,
    });

    const wrongFemalePlayers = await Player.findAll({
      attributes: ["id", "memberId", "gender"],
      where: {
        memberId: memberIdsFemale,
        gender: {
          [Op.not]: "F",
        },
      },
      transaction,
    });

    await this.setGender(
      wrongMalePlayers.map((p) => p.id),
      "M",
      transaction
    );
    await this.setGender(
      wrongFemalePlayers.map((p) => p.id),
      "F",
      transaction
    );
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
      }
    );
  }

  private async setGender(id: string[], gender: "M" | "F", transaction?: Transaction) {
    transaction = transaction || (await this._sequelize.transaction());

    if (id.length === 0) {
      return;
    }

    const [changed] = await Player.update(
      {
        gender,
      },
      {
        where: {
          id: id,
        },
        transaction,
      }
    );

    this._logger.verbose(`updated ${changed} player(s) gender to ${gender}`);
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
  gender: "M" | "V";
  startdate: Date;
  enddate: Date;
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
};
