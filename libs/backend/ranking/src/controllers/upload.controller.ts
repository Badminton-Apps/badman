import {
  Body,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import * as XLSX from 'xlsx';
import { MembersRolePerGroupData, UpdateRankingService } from '../services';

@Controller('ranking/upload')
export class UploadRankingController {
  private readonly _logger = new Logger(UploadRankingController.name);

  constructor(private _updateRankingService: UpdateRankingService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  async preview(@UploadedFile() file: Express.Multer.File) {
    const mappedData = this._readFile(file);

    // filter out competition members
    const filteredData = mappedData.filter(
      (row) => row.role === 'Competitiespeler'
    );

    // Get headers
    const headerRow = [
      'memberId',
      'firstName',
      'lastName',
      'single',
      'doubles',
      'mixed',
    ];
    // Return the first 10 rows
    return [headerRow, ...filteredData.slice(0, 10)];
  }

  @Post('process')
  @UseInterceptors(FileInterceptor('file'))
  async process(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    {
      updateCompStatus,
      updateRanking,
      rankingDate,
      removeAllRanking,
      rankingSystemId,
    }: {
      rankingDate: Date;
      updateCompStatus: boolean;
      updateRanking?: boolean;
      removeAllRanking: boolean;
      rankingSystemId: string;
    }
  ) {
    const mappedData = this._readFile(file);

    // filter out competition members
    const filteredData = mappedData.filter(
      (row) => row.role === 'Competitiespeler'
    );

    await this._updateRankingService.processFileUpload(filteredData, {
      updateCompStatus,
      updateRanking,
      rankingDate,
      removeAllRanking,
      rankingSystemId,
    });

    return { message: 'File processed successfully' };
  }

  private _readFile(file: Express.Multer.File) {
    const workbook = XLSX.read(file.buffer);

    // if data hase multiple sheets use bbfRating
    if (workbook.SheetNames?.[0] == 'HE-SM') {
      return this.readBBFRating(workbook);
    }

    return this.readExportMemebrs(workbook);
  }

  private readBBFRating(workbook: XLSX.WorkBook) {
    // Each sheat has a person 1 time with a ranking for each category
    const players = new Map<string, MembersRolePerGroupData>();

    workbook.SheetNames.forEach((sheetName) => {
      const data = XLSX.utils.sheet_to_json<bbfRating>(
        workbook.Sheets[sheetName]
      );
      for (const row of data) {
        let player = players.get(row['P1Memberid']);

        if (!player) {
          const names = [
            row['P1Lastname']?.trim(),
            row['P1Middlename']?.trim(),
          ]?.filter((name) => !!name);

          player = {
            memberId: row['P1Memberid'],
            firstName: row['P1Firstname'],
            lastName: names.join(' '),
            role: 'Competitiespeler',
          } as MembersRolePerGroupData;
        }

        switch (sheetName) {
          case 'HE-SM':
          case 'DE-SM':
            player.single = row['Level'];
            player.singlePoints = row['Points'];
            break;
          case 'HD-DM':
          case 'DD':
            player.doubles = row['Level'];
            player.doublesPoints = row['Points'];
            break;
          case 'GD H-DX M':
          case 'GD D-DX D':
            player.mixed = row['Level'];
            player.mixedPoints = row['Points'];
            break;
        }

        players.set(row['P1Memberid'], player);
      }
    });

    return [...players.values()];
  }

  private readExportMemebrs(workbook: XLSX.WorkBook) {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<exportMembers>(firstSheet);

    return data?.map((row) => {
      // combine lastname 2, middlename and lastname to a single last name
      const names = [
        row['lastname']?.trim(),
        row['middlename']?.trim(),
        row['lastname2']?.trim(),
      ]?.filter((name) => !!name);

      return {
        memberId: row['memberid'],
        firstName: row['firstname'],
        lastName: names?.join(' '),
        single: row['PlayerLevelSingle'],
        doubles: row['PlayerLevelDouble'],
        mixed: row['PlayerLevelMixed'],
        role: row['TypeName'],
      } as MembersRolePerGroupData;
    });
  }
}

interface bbfRating {
  P1Memberid: string;
  P1Firstname: string;
  P1Lastname: string;
  P1Middlename: string;
  P1Lastname2: string;
  Level: number;
  Points: number;
}

interface exportMembers {
  memberid: string;
  firstname: string;
  lastname: string;
  middlename: string;
  lastname2: string;
  PlayerLevelSingle: number;
  PlayerLevelDouble: number;
  PlayerLevelMixed: number;
  TypeName: string;
}
