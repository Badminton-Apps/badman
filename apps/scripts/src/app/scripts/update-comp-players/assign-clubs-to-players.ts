import { Club, Player, ClubPlayerMembership } from "@badman/backend-database";
import { ClubMembershipType } from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import xlsx from "xlsx";

@Injectable()
export class UpdaetComPlayers {
  private readonly logger = new Logger(UpdaetComPlayers.name);
  constructor(private _sequelize: Sequelize) {
    this.logger.log("UpdaetComPlayers");
  }

  async process() {
    const transaction = await this._sequelize.transaction();

    try {
      this.logger.verbose(`Fixing comp status for players`);

      // load  xlsx file
      await this.newPlayers(transaction);
      await this.existingPlyers(transaction);

      await transaction.commit();
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
    }
  }

  private async newPlayers(transaction: Transaction) {
    const workbook = xlsx.readFile(
      `apps/scripts/src/app/scripts/update-comp-players/Nieuwe competitiespelers.xlsx`
    );
    const data = xlsx.utils.sheet_to_json<ExcelNewCompPlayers>(
      workbook.Sheets[workbook.SheetNames[0]]
    );
    await this.updatePlayers(transaction, data);
  }
  private async existingPlyers(transaction: Transaction) {
    const workbook = xlsx.readFile(
      `apps/scripts/src/app/scripts/update-comp-players/Omzetten naar competitiespeler in badman.xlsx`
    );
    const data = xlsx.utils.sheet_to_json<ExcelNewCompPlayers>(
      workbook.Sheets[workbook.SheetNames[0]]
    );
    await this.updatePlayers(transaction, data);
  }

  private async updatePlayers(
    transaction: Transaction,
    data: (ExcelNewCompPlayers | ExcelConvertCompPlayers)[]
  ) {
    for (const row of data) {
      // find player
      let player = await Player.findOne({
        where: {
          memberId: `${row.Lidnummer}`,
        },
        transaction,
      });

      if (!player) {
        player = await Player.create(
          {
            memberId: `${row.Lidnummer}`,
            firstName: row.Voornaam,
            lastName: row.Achternaam,
            gender: row.Geslacht == "M" ? "M" : "F",
          },
          {
            transaction,
          }
        );

        this.logger.verbose(`Created player ${player.fullName}`);
      }

      player.competitionPlayer = true;
      await player.save();

      // find club
      const club = await Club.findOne({
        where: {
          clubId: row.Clubnummer,
        },
        transaction,
      });

      const clubs = (await player.getClubs({
        transaction,
      })) as (Club & {
        ClubPlayerMembership: ClubPlayerMembership;
      })[];
      const currentClubs = clubs.filter((c) => c?.ClubPlayerMembership.end === null);
      const activeClubs = currentClubs.filter((c) => c?.ClubPlayerMembership?.active);

      if (!club) {
        this.logger.error(`Club not found ${row.Clubnummer}`);
        continue;
      }

      // if no active clubs or club is not in active clubs
      if (activeClubs.length) {
        //  set an end date on the last day of august
        for (const activeClub of activeClubs.filter((c) => c.id !== club?.id)) {
          this.logger.verbose(
            `Setting end date for ${player.fullName} in ${activeClub.name} to 31-08-${new Date().getFullYear()}`
          );
          await ClubPlayerMembership.update(
            {
              end: new Date(new Date().getFullYear(), 8, 0),
            },
            {
              where: {
                clubId: activeClub.id,
                playerId: player.id,
              },
              transaction,
            }
          );
        }
      }

      if (!activeClubs.find((c) => c.id === club.id) || !activeClubs.length) {
        await ClubPlayerMembership.create(
          {
            clubId: club.id,
            playerId: player.id,
            start: new Date(new Date().getFullYear(), 8, 1),
            membershipType: ClubMembershipType.NORMAL,
            confirmed: true,
          },
          {
            transaction,
          }
        );

        this.logger.verbose(
          `Assigned ${player.fullName} to ${club.name} (oldClub: ${currentClubs.map((c) => c.name).join(", ")})`
        );
      }
    }
  }
}

type ExcelNewCompPlayers = {
  Clubnummer: string;
  Lidnummer: number;
  Achternaam: string;
  Voornaam: string;
  Geslacht: "M" | "V";
  Geboortedatum: string;
  Adres: string;
  Postcode: string;
  Gemeente: string;
  Telefoon: string;
  Email: string;
  Spelertype: string;
  Startlidmaatschap: string;
};

type ExcelConvertCompPlayers = {
  Clubnummer: string;
  Lidnummer: number;
  Achternaam: string;
  Voornaam: string;
  Geslacht: "M" | "V";
  Spelertype: string;
};
