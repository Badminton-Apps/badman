import { Club, Player } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import xlsx from 'xlsx';

@Injectable()
export class AssignClubToPlayers {
  private readonly logger = new Logger(AssignClubToPlayers.name);

  constructor(private _sequelize: Sequelize) {
    this.logger.log('AssignClubToPlayers');
  }

  async process() {
    const xlData = this.readExcelFile();
    const memberIds = this.extractMemberIds(xlData);
    const clubs = await this.getAllClubs();
    const players = await this.getPlayersWithClubs(memberIds);

    const changes = this.findClubChanges(xlData, clubs, players);

    this.writeChangesToExcel(changes);
  }

  private readExcelFile() {
    const workbook = xlsx.readFile(
      './apps/scripts/src/app/shared-files/exportMembersRolePerGroup-06052024.xlsx',
    );
    const sheet_name_list = workbook.SheetNames;
    return xlsx.utils.sheet_to_json<ExcelInput>(workbook.Sheets[sheet_name_list[0]]);
  }

  private extractMemberIds(xlData: ExcelInput[]) {
    return xlData.map((row) => row.memberid);
  }

  private async getAllClubs() {
    return Club.findAll({
      attributes: ['id', 'name', 'fullName'],
    });
  }

  private async getPlayersWithClubs(memberIds: string[]) {
    return Player.findAll({
      where: { memberId: memberIds },
      include: [
        {
          model: Club,
          attributes: ['id', 'name', 'fullName'],
          required: false,
          through: { attributes: ['id', 'active', 'end', 'start', 'confirmed'] },
        },
      ],
    });
  }

  private findClubChanges(xlData: ExcelInput[], clubs: Club[], players: Player[]) {
    const changes = [] as ExcelOutput[];

    xlData.forEach((row) => {
      const club = clubs.find(
        (c) =>
          c.name?.toLowerCase() === row.groupname?.toLowerCase() ||
          c.fullName?.toLowerCase() === row.groupname?.toLowerCase(),
      );

      const player = players.find((p) => p.memberId === row.memberid);

      if (club && player) {
        const activeClub = player.clubs?.find((c) => c.ClubPlayerMembership?.active);

        if (activeClub?.id !== club.id) {
          changes.push({
            memberId: row.memberid,
            name: player.fullName,
            type: row.TypeName,
            currentClub: activeClub?.name ?? '',
            newClub: club.name ?? '',
            exportClub: row.groupname,
            clubId: activeClub?.id ?? '',
            newClubId: club.id,
            flemish: row.memberid[0] === '5',
          });
        }
      }
    });

    return changes;
  }

  private writeChangesToExcel(changes: ExcelOutput[]) {
    const ws = xlsx.utils.json_to_sheet(changes);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'changes');
    xlsx.writeFile(wb, './apps/scripts/src/app/shared-files/club-changes.xlsx');
  }
}

type ExcelInput = {
  groupname: string;
  memberid: string;
  TypeName: 'Recreant' | 'Jeugd' | 'Competitiespeler';
};

type ExcelOutput = {
  memberId: string;
  name: string;
  currentClub: string;
  newClub: string;
  exportClub: string;
  flemish: boolean;
  type: string;
  clubId: string;
  newClubId: string;
};
