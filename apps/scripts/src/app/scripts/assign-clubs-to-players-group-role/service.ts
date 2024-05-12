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
    // read the excel file in ../shared/exportMembersRolePerGroup-06052024.xlsx
    const workbook = xlsx.readFile(
      './apps/scripts/src/app/shared-files/exportMembersRolePerGroup-06052024.xlsx',
    );
    const sheet_name_list = workbook.SheetNames;
    const xlData = xlsx.utils
      .sheet_to_json<{
        groupname: string;
        memberid: string;
        TypeName: 'Recreant' | 'Jeugd' | 'Competitiespeler';
      }>(workbook.Sheets[sheet_name_list[0]])
      .filter((row) => row.TypeName == 'Competitiespeler');
    // get all clubs
    const memberIds = xlData.map((row) => row.memberid);

    const clubs = await Club.findAll();
    const players = await Player.findAll({
      where: { memberId: memberIds },
      include: [Club],
    });

    const changes = [] as {
      memberId: string;
      name: string;
      currentClub: string;
      newClub: string;
      exportClub: string;
      flemish: boolean;
      clubId: string;
      newClubId: string;
    }[];

    // for each row get the club that matches the club name or fullname ignoring case
    // and write the club id next to the club name in the excel file
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

    // write changes to excel
    const ws = xlsx.utils.json_to_sheet(changes);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'changes');
    xlsx.writeFile(wb, './apps/scripts/src/app/shared-files/club-changes.xlsx');
  }
}
