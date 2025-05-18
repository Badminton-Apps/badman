import { Club, ClubPlayerMembership, Player } from '@badman/backend-database';
import { ClubMembershipType } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import 'multer';
import { Op } from 'sequelize';
import * as XLSX from 'xlsx';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  public async process(file: Buffer, season: number) {
    const mappedData = await this._readFile(file);
    this.logger.debug(`Processing ${mappedData.length} transfer`);
    if (mappedData.length === 0) {
      this.logger.error('No data found in file');
      return { message: false };
    }

    return await this._createMemberships(mappedData, season);
  }

  private async _createMemberships(data: Transfers[], season: number) {
    const players = await Player.findAll({
      attributes: ['id', 'memberId', 'firstName', 'lastName'],
      where: {
        memberId: data.map((d) => `${d.Lidnummer}`),
      },
    });

    const clubs = await Club.findAll({
      attributes: ['id', 'name', 'clubId'],
      where: {
        clubId: data.map((d) => d.NieuwClubnummer),
      },
    });

    const memberships = await ClubPlayerMembership.findAll({
      where: {
        playerId: players.map((p) => p.id),
        membershipType: ClubMembershipType.NORMAL,
        end: null,
      },
    });

    for (const d of data) {
      const player = players.find((p) => p.memberId === `${d.Lidnummer}`);
      if (!player) {
        this.logger.error(`Player with memberId ${d.Lidnummer} not found`);
        continue;
      }

      const newClubId = clubs.find((c) => c.clubId === d.NieuwClubnummer)?.id;
      if (!newClubId) {
        this.logger.error(`Club ${d.NieuwClubnummer} not found`);
        continue;
      }

      const startDate = moment()
        .set('year', season)
        .startOf('year')
        .set('month', 6)
        .set('date', 1)
        .toDate();

      // check if the player is already a member of the new club with the current season
      const thisseasonMemberships = await ClubPlayerMembership.findAll({
        where: {
          playerId: player.id,
          membershipType: ClubMembershipType.NORMAL,
          clubId: newClubId,
          start: {
            [Op.gte]: startDate,
          },
        },
      });

      if (thisseasonMemberships.length > 0) {
        this.logger.debug(`Player ${player.fullName} already has a membership for this season`);
        // if multiple memberships exist, take one with the latest start date and delete the rest and set the end date to null
        const latestMembership = thisseasonMemberships.reduce((prev, current) =>
          prev.start > current.start ? prev : current,
        );

        for (const membership of thisseasonMemberships) {
          if (membership.id !== latestMembership.id) {
            this.logger.debug(
              `Deleting old membership ${membership.id} for player ${player.fullName}`,
            );
            await membership.destroy();
          } else {
            this.logger.debug(`Keeping membership ${membership.id} for player ${player.fullName}`);
            membership.end = null;
            await membership.save();
          }
        }

        continue;
      }

      const playerMemberships = memberships.filter((m) => m.playerId === player.id);
      // check if any members is with the current club
      const currentMembership = playerMemberships.find((m) => m.clubId === newClubId);

      if (!currentMembership) {
        this.logger.debug(`Processing new club membership for player ${player.fullName}`);
        const newMembership = new ClubPlayerMembership();
        newMembership.playerId = player.id;
        newMembership.start = startDate;
        newMembership.membershipType = ClubMembershipType.NORMAL;
        newMembership.clubId = newClubId;
        newMembership.confirmed = true;
        await newMembership.save();

        // mark old membershipss as end

        for (const playerMembership of playerMemberships) {
          if (playerMembership && playerMembership.confirmed) {
            // mark the old membership as ended
            playerMembership.end = moment().toDate();
            await playerMembership.save();
          }
        }
      } else {
        this.logger.debug(`Processing existing club membership for player ${player.fullName}`);
      }
    }
  }

  private async _readFile(file: Buffer, rows: number | undefined = undefined) {
    const workbook = XLSX.read(file, {
      dense: true,
      sheetRows: rows,
    });

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Transfers>(firstSheet);

    return data;
  }
}

interface Transfers {
  Lidnummer: number;
  Voornaam: string;
  Naam: string;
  OudeClub: string;
  OudClubnummer: number;
  NieuweClub: string;
  NieuwClubnummer: number;
}
