import { Club, ClubPlayerMembership, Player } from "@badman/backend-database";
import { ClubMembershipType } from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import moment from "moment";
import "multer";
import { literal, Op } from "sequelize";
import * as XLSX from "xlsx";

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  public async process(file: Buffer, season: number) {
    const mappedData = await this._readFile(file);
    this.logger.debug(`Processing ${mappedData.length} loans`);
    if (mappedData.length === 0) {
      this.logger.error("No data found in file");
      return { message: false };
    }

    return await this._createMemberships(mappedData, season);
  }

  private async _createMemberships(data: Loans[], season: number) {
    const players = await Player.findAll({
      attributes: ["id", "memberId", "firstName", "lastName"],
      where: {
        memberId: data.map((d) => `${d.Lidnummer}`),
      },
    });

    const clubs = await Club.findAll({
      attributes: ["id", "name", "clubId"],
      where: {
        clubId: data.map((d) => d.ontLenendeClubNummer),
      },
    });

    // We take a month before the start of the season and a month after the end of the season
    const startDate = moment().set("year", season).startOf("year").set("month", 6).set("date", 1);

    const endDate = moment()
      .set("year", season + 1)
      .startOf("year")
      .set("month", 5)
      .endOf("month");

    const memberships = await ClubPlayerMembership.findAll({
      where: {
        playerId: players.map((p) => p.id),
        membershipType: ClubMembershipType.LOAN,
        [Op.and]: [
          { start: { [Op.gte]: startDate.toDate() } },
          { end: { [Op.lte]: endDate.toDate() } },
        ],
      },
    });

    for (const d of data) {
      const player = players.find((p) => p.memberId === `${d.Lidnummer}`);
      if (!player) {
        this.logger.error(`Player with memberId ${d.Lidnummer} not found`);
        continue;
      }

      const newClubId = clubs.find((c) => c.clubId === d.ontLenendeClubNummer)?.id;
      if (!newClubId) {
        this.logger.error(`Club ${d.ontLenendeClubNummer} not found`);
        continue;
      }

      let membership = memberships.find((m) => m.playerId === player.id);
      if (!membership || membership.clubId !== newClubId) {
        this.logger.debug(`Processing new club membership for player ${player.fullName}`);
        membership = new ClubPlayerMembership();
        membership.playerId = player.id;
        membership.start = startDate.toDate();
        membership.end = endDate.toDate();
        membership.membershipType = ClubMembershipType.LOAN;
        membership.clubId = newClubId;
        membership.confirmed = true;
        await membership.save();
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
    const data = XLSX.utils.sheet_to_json<Loans>(firstSheet);

    return data;
  }
}

interface Loans {
  Lidnummer: number;
  Voornaam: string;
  Naam: string;
  uitlenendeClub: string;
  uitlenendeClubNummer: number;
  ontLenendeClub: string;
  ontLenendeClubNummer: number;
}
