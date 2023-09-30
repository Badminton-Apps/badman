import { Club, ClubPlayerMembership, Player } from '@badman/backend-database';
import { ClubMembershipType } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import { Includeable, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { unlinkSync, existsSync } from 'fs';
import xlsx from 'xlsx';

const includedClubs = [
  {
    attributes: ['id', 'name', 'clubId'],
    model: Club,
  },
] as Includeable[];

@Injectable()
export class AssignClubToPlayers {
  log: {
    userId?: string;
    firstName?: string;
    lastName?: string;
    club?: string;
    action?: string;
    description?: string;
  }[] = [];

  unkownClubs: {
    userId?: string;
    firstName?: string;
    lastName?: string;
    club?: string;
    clubNumber: string;
  }[] = [];

  unkownPlayers: {
    userId?: string;
    firstName?: string;
    lastName?: string;
  }[] = [];

  private readonly logger = new Logger(AssignClubToPlayers.name);
  constructor(private _sequelize: Sequelize) {
    this.logger.log('AssignClubToPlayers');
  }

  async process(season: number) {
    const transaction = await this._sequelize.transaction();

    // create an excel to track all actions

    try {
      this.logger.verbose(`Fixing clubs for players`);

      const clubs = await this.loadClubs(season, transaction);
      const players = await this.loadPlayers(season, transaction);

      // Transfers are already in the Player list, so we need to update the active club for the player
      await this.processPlayersClubs(season, players, clubs, transaction);
      // Loans are not in the Player list, so we need to add the loan to the player
      await this.processLoans(players, clubs);

      // write log to xlsx file
      await this.writeLog();

      await transaction.commit();
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
    }
  }

  private async writeLog() {
    const fileName = 'log.xlsx';
    const wb = xlsx.utils.book_new();
    const ws1 = xlsx.utils.json_to_sheet(this.log);

    // Set column width
    const wscols = [
      { wch: 10 },
      { wch: Math.max(...this.log.map((c) => c.firstName?.length ?? 0)) },
      { wch: Math.max(...this.log.map((c) => c.lastName?.length ?? 0)) },
      { wch: Math.max(...this.log.map((c) => c.club?.length ?? 0)) },
      { wch: 10 },
    ];

    ws1['!cols'] = wscols;

    // Enable filtering
    ws1['!autofilter'] = {
      ref: xlsx.utils.encode_range(
        xlsx.utils.decode_range(ws1['!ref'] as string)
      ),
    };
    xlsx.utils.book_append_sheet(wb, ws1, 'Log');

    const ws2 = xlsx.utils.json_to_sheet(this.unkownClubs);
    ws2['!autofilter'] = {
      ref: xlsx.utils.encode_range(
        xlsx.utils.decode_range(ws2['!ref'] as string)
      ),
    };
    xlsx.utils.book_append_sheet(wb, ws2, 'Unknown Clubs');

    const ws3 = xlsx.utils.json_to_sheet(this.unkownPlayers);
    ws3['!autofilter'] = {
      ref: xlsx.utils.encode_range(
        xlsx.utils.decode_range(ws3['!ref'] as string)
      ),
    };
    xlsx.utils.book_append_sheet(wb, ws3, 'Unknown Players');

    if (existsSync(fileName)) {
      unlinkSync(fileName);
    }

    xlsx.writeFile(wb, fileName);
  }

  async processPlayersClubs(
    season: number,
    players: Map<
      string,
      {
        player: Player;
        groupname: string;
      }
    >,
    clubs: Map<string, Club>,
    transaction: Transaction
  ) {
    for (const player of players.values()) {
      const club = clubs.get(player.groupname);

      if (club == null) {
        this.logger.warn(
          `No club found for player ${player.player.firstName} ${player.player.lastName} for club ${player.groupname}`
        );

        this.unkownClubs.push({
          userId: player.player.memberId,
          firstName: player.player.firstName,
          lastName: player.player.lastName,
          clubNumber: player.groupname,
        });

        continue;
      }

      // set all club memberships end dates to 2023-05-01 (start of new season)
      // except if the club is the groupname
      for (const clubMembership of player.player.clubs ?? []) {
        // update values
        if (
          clubMembership.ClubPlayerMembership.clubId === club.id &&
          clubMembership.ClubPlayerMembership.end === null
        ) {
          this.logger.verbose(
            `Curremt club of player ${player.player.firstName} ${player.player.lastName} is ${clubMembership.name}`
          );

          this.log.push({
            userId: player.player.memberId,
            firstName: player.player.firstName,
            lastName: player.player.lastName,
            club: clubMembership.name,
            action: 'no-action',
          });
        } else if (clubMembership.ClubPlayerMembership.end != null) {
          this.logger.verbose(
            `Set end date for player ${player.player.firstName} ${player.player.lastName} for club ${clubMembership.name}`
          );
          clubMembership.ClubPlayerMembership.end = new Date(`${season}-05-01`);

          const [affected] = await ClubPlayerMembership.update(
            {
              end: clubMembership.ClubPlayerMembership.end,
            },
            {
              where: {
                id: clubMembership.ClubPlayerMembership.id,
                clubId: clubMembership.ClubPlayerMembership.clubId,
                playerId: clubMembership.ClubPlayerMembership.playerId,
              },
              transaction,
            }
          );

          if (affected === 0) {
            throw new Error(
              `No club membership found for player ${player.player.firstName} ${player.player.lastName} for club ${clubMembership.name}`
            );
          }

          this.log.push({
            userId: player.player.memberId,
            club: clubMembership.name,
            firstName: player.player.firstName,
            lastName: player.player.lastName,
            action: 'end',
          });
        }
      }

      // if no club membership exists for the club, create one
      if (
        player.player.clubs?.find(
          (c) =>
            c.ClubPlayerMembership?.clubId === club.id &&
            c.ClubPlayerMembership?.end == null
        ) == null
      ) {
        this.logger.verbose(
          `Create club membership for player ${player.player.firstName} ${player.player.lastName} for club ${club.name}`
        );

        this.log.push({
          userId: player.player.memberId,
          firstName: player.player.firstName,
          lastName: player.player.lastName,
          club: club.name,
          action: 'create',
        });

        const clubMembership = new ClubPlayerMembership({
          clubId: club.id,
          playerId: player.player.id,
          start: new Date(`${season}-05-01`),
          membershipType: ClubMembershipType.NORMAL,
        });
        await clubMembership.save({ transaction });
      }
    }
  }

  async processLoans(
    players: Map<
      string,
      {
        player: Player;
        groupname: string;
      }
    >,
    clubs: Map<string, Club>
  ) {
    const Loanxlsx = xlsx.readFile(
      'apps/scripts/src/app/scripts/assign-clubs-to-players/Uitleningen 2023-2024.xlsx'
    );
    const LoanSheet = Loanxlsx.Sheets[Loanxlsx.SheetNames[0]];
    const LoanJson = xlsx.utils.sheet_to_json<{
      Voornaam: string;
      Naam: string;
      'Club die uitleent': string;
      'Club die ontleent': string;
    }>(LoanSheet, {
      range: 1,
    });

    for (const loan of LoanJson) {
      // check if player data is correct
      if (loan.Voornaam == null || loan.Naam == null) {
        continue;
      }

      const playerMap = players.get(`${loan.Voornaam} ${loan.Naam}`);

      if (playerMap == null) {
        continue;
      }

      const player = playerMap.player;

      const oldClub = clubs.get(loan['Club die uitleent']);
      const newClub = clubs.get(loan['Club die ontleent']);

      this.logger.verbose(
        `Loan player ${player.firstName} ${player.lastName} from ${oldClub?.name} to ${newClub?.name}`
      );

      this.log.push({
        userId: player.memberId,
        firstName: player.firstName,
        lastName: player.lastName,
        club: newClub?.name,
        action: 'loan',
      });
    }
  }

  async loadClubs(season: number, transaction: Transaction) {
    this.logger.verbose(`Loading clubs`);
    const clubsxlsx = xlsx.readFile(
      `apps/scripts/src/app/scripts/assign-clubs-to-players/Clubs ${season}-${
        season + 1
      }.xlsx`
    );
    const clubsSheet = clubsxlsx.Sheets[clubsxlsx.SheetNames[0]];
    let clubsJson = xlsx.utils.sheet_to_json<{
      ClubNumber: string;
      ClubName: string;
      MembershipName: string;
      'Club Total': number;
      Total: number;
      Male: number;
      Female: number;
    }>(clubsSheet);

    clubsJson = clubsJson?.filter(
      (c) => c.ClubNumber != null && c.MembershipName == 'Competitiespeler'
    );

    const clubs = await Club.findAll({
      attributes: ['id', 'name', 'clubId'],
      where: {
        clubId: clubsJson
          .map((c) => parseInt(c.ClubNumber))
          ?.filter((c) => c != null && c > 0),
      },
    });

    // map from clubName and club
    const clubMap = new Map<string, Club>();
    for (const cjson of clubsJson) {
      let club = clubs.find((c) => c.clubId === parseInt(cjson.ClubNumber));

      if (club == null) {
        if (cjson.ClubNumber == 'BV' || cjson.ClubNumber == 'LFBB-JE') {
          continue;
        }
        this.logger.verbose(
          `Created club ${cjson.ClubName} with id ${cjson.ClubNumber}`
        );

        club = new Club({
          clubId: parseInt(cjson.ClubNumber),
          name: cjson.ClubName,
        });

        club = await club.save({
          transaction,
        });
      }

      clubMap.set(cjson.ClubName, club);
    }

    return clubMap;
  }

  async loadPlayers(season: number, transaction: Transaction) {
    this.logger.verbose(`Loading players`);
    const playersxlsx = xlsx.readFile(
      `apps/scripts/src/app/shared-files/Players ${season}-${season + 1}.xlsx`
    );
    const playersSheet = playersxlsx.Sheets[playersxlsx.SheetNames[0]];
    let playersJson = xlsx.utils.sheet_to_json<{
      groupname: string;
      memberid: string;
      lastname: string;
      firstname: string;
    }>(playersSheet);

    playersJson = playersJson?.filter(
      (c) => c.memberid != null && c.memberid != '' && c.memberid != undefined
    );

    const players = await Player.findAll({
      attributes: ['id', 'firstName', 'lastName', 'memberId'],
      where: {
        memberId: playersJson?.map((c) => c.memberid),
      },
      include: includedClubs,
    });

    // map from clubName and club
    const playerMap = new Map<
      string,
      {
        player: Player;
        groupname: string;
      }
    >();
    for (const cjson of playersJson) {
      let player = players.find((c) => c.memberId === cjson.memberid);

      if (player == null) {
        player = new Player({
          memberId: cjson.memberid,
          firstName: cjson.firstname,
          lastName: cjson.lastname,
        });

        player = await player.save({
          transaction,
        });
      }

      playerMap.set(`${cjson.firstname} ${cjson.lastname}`, {
        player,
        groupname: cjson.groupname,
      });
    }

    return playerMap;
  }
}
