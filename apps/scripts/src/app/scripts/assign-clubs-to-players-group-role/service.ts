import { Club } from '@badman/backend-database';
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
    const xlData = xlsx.utils.sheet_to_json<{
      groupname: string;
      clubId: string;
    }>(workbook.Sheets[sheet_name_list[0]]);

    // get all clubs
    const clubs = await Club.findAll();

    // for each row get the club that matches the club name or fullname ignoring case
    // and write the club id next to the club name in the excel file
    xlData.forEach((row) => {
      const club = clubs.find(
        (c) =>
          c.name?.toLowerCase() === row.groupname?.toLowerCase() ||
          c.fullName?.toLowerCase() === row.groupname?.toLowerCase(),
      );
      if (club) {
        row.clubId = club.id;
      }
    });

    // write the updated excel file
    const newWorkBook = xlsx.utils.book_new();
    const newWorksheet = xlsx.utils.json_to_sheet(xlData);
    xlsx.utils.book_append_sheet(newWorkBook, newWorksheet, 'Sheet2');
    xlsx.writeFile(
      newWorkBook,
      './apps/scripts/src/app/shared-files/exportMembersRolePerGroup-06052024-new.xlsx',
    );
  }
}
