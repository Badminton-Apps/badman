import { Club, ClubPlayerMembership, Player } from '@badman/backend-database';
import { ClubMembershipType } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import 'multer';
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

  private async _createMemberships(data: TransfersMapped[], season: number) {
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

      let membership = memberships.find((m) => m.playerId === player.id);
      if (!membership) {
        this.logger.debug(`Processing new club membership for player ${player.fullName}`);
        membership = new ClubPlayerMembership();
        membership.playerId = player.id;
        membership.start = moment()
          .set('year', season)
          .startOf('year')
          .set('month', 6)
          .set('date', 1)
          .toDate();
        membership.membershipType = ClubMembershipType.NORMAL;
      } else {
        this.logger.debug(`Processing existing club membership for player ${player.fullName}`);
      }

      membership.clubId = newClubId;
      membership.confirmed = true;
      await membership.save();
    }
  }

  private async _readFile(file: Buffer, rows: number | undefined = undefined) {
    const workbook = XLSX.read(file, {
      dense: true,
      sheetRows: rows,
    });

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils
      .sheet_to_json<Transfers>(firstSheet, {
        range: 1,
      })
      .map((d) => ({
        Lidnummer: d.Lidnummer,
        Voornaam: d.Voornaam,
        Naam: d.Naam,
        OudeClub: d['Oude Club'],
        OudClubnummer: parseInt(d['Oud clubnummer']) || -1,
        NieuweClub: d['Nieuwe club'],
        NieuwClubnummer: parseInt(d['Nieuw clubnummer']) || -1,
      }));

    return data;
  }
}

interface Transfers {
  Lidnummer: number;
  Voornaam: string;
  Naam: string;
  ['Oude Club']: string;
  ['Oud clubnummer']: string;
  ['Nieuwe club']: string;
  ['Nieuw clubnummer']: string;
}

interface TransfersMapped {
  Lidnummer: number;
  Voornaam: string;
  Naam: string;
  OudeClub: string;
  OudClubnummer: number;
  NieuweClub: string;
  NieuwClubnummer: number;
}
