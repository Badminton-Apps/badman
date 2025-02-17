import { File, MultipartFile, UploadGuard } from '@badman/backend-utils';
import { MultipartValue } from '@fastify/multipart';
import { Controller, Logger, Post, Res, UseGuards } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import moment from 'moment';
import { Worker } from 'worker_threads';
import * as XLSX from 'xlsx';
import { MembersRolePerGroupData, UpdateRankingService } from '../services';
import workerThreadFilePath from '../worker/config';
import { ConfigService } from '@nestjs/config';

@Controller('ranking/upload')
export class UploadRankingController {
  private readonly _logger = new Logger(UploadRankingController.name);

  constructor(
    private _updateRankingService: UpdateRankingService,
    private _config: ConfigService,
  ) {}

  @Post('preview')
  @UseGuards(UploadGuard)
  async preview(@File() file: MultipartFile) {
    const mappedData = await this._readFile(file, 10);

    // filter out competition members
    const filteredData = mappedData.filter((row) => row.role === 'Competitiespeler');

    // Get headers
    const headerRow = ['memberId', 'role', 'firstName', 'lastName', 'single', 'doubles', 'mixed'];
    // Return the first 10 rows
    return [headerRow, ...filteredData];
  }

  @Post('process')
  @UseGuards(UploadGuard)
  async process(@File() file: MultipartFile, @Res() res: FastifyReply) {
    this._readFile(file).then((mappedData) => {
      const updateCompStatus =
        (file.fields['updateCompStatus'] as MultipartValue)?.value === 'true';
      const updateRanking = (file.fields['updateRanking'] as MultipartValue)?.value === 'true';
      const rankingDate = moment((file.fields['rankingDate'] as MultipartValue)?.value as string);

      const removeAllRanking =
        (file.fields['removeAllRanking'] as MultipartValue)?.value === 'true';
      const updatePossible = (file.fields['updatePossible'] as MultipartValue)?.value === 'true';
      const updateClubs = (file.fields['updateClubs'] as MultipartValue)?.value === 'true';
      const rankingSystemId = (file.fields['rankingSystemId'] as MultipartValue)?.value as string;

      const createNewPlayers =
        (file.fields['createNewPlayers'] as MultipartValue)?.value === 'true';

      if (updateRanking && !rankingDate.isValid()) {
        throw new Error('Invalid ranking date');
      }

      res.send({ message: true });

      if (this._config.get('NODE_ENV') === 'development') {
        try {
          this._updateRankingService.processFileUpload(mappedData, {
            updateCompStatus,
            updateRanking,
            updatePossible,
            updateClubs,
            rankingDate: rankingDate.toDate(),
            removeAllRanking,
            rankingSystemId,
            createNewPlayers,
          });
        } catch (e) {
          this._logger.error('Error processing file', e);
        }
      } else {
        const worker = new Worker(workerThreadFilePath, {
          workerData: JSON.stringify({
            updateCompStatus,
            updateRanking,
            updatePossible,
            updateClubs,
            rankingDate,
            removeAllRanking,
            rankingSystemId,
            createNewPlayers,
            mappedData,
          }),
        });

        worker.on('error', (e) => {
          return this._logger.error('on error', e);
        });
        worker.on('exit', (code) => {
          this._logger.log('Processing existed', code);
        });
      }
    });
  }

  private async _readFile(file: MultipartFile, rows: number | undefined = undefined) {
    const workbook = XLSX.read(await file.toBuffer(), {
      dense: true,
      sheetRows: rows,
    });

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
      const data = XLSX.utils.sheet_to_json<bbfRating>(workbook.Sheets[sheetName]);
      for (const row of data) {
        let player = players.get(row['P1Memberid']);

        if (!player) {
          const names = [row['P1Lastname']?.trim(), row['P1Middlename']?.trim()]?.filter(
            (name) => !!name,
          );

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
    const data = XLSX.utils.sheet_to_json<exportMembers>(firstSheet)?.map((row) => {
      // combine lastname 2, middlename and lastname to a single last name
      const names = [
        row['lastname']?.trim(),
        row['middlename']?.trim(),
        row['lastname2']?.trim(),
      ]?.filter((name) => !!name);

      const startdate = this.parseExcelDate(row['startdate']);
      const enddate = this.parseExcelDate(row['endate']);

      return {
        memberId: row['memberid'],
        firstName: row['firstname'],
        lastName: names?.join(' '),
        clubName: row['groupname'],
        gender: row['gender'],
        startdate: new Date(startdate.year, startdate.month - 1, startdate.day),
        enddate: new Date(enddate.year, enddate.month - 1, enddate.day),
        single: row['PlayerLevelSingle'],
        doubles: row['PlayerLevelDouble'],
        mixed: row['PlayerLevelMixed'],
        role: row['TypeName'],
      } as MembersRolePerGroupData;
    });

    // make sure each memberId only occurs once, if multipe times,
    // the first pick: role == Competitiespeler
    // the first pick: role == Recreant
    // the first pick: role == Jeugd

    const players = new Map<string, MembersRolePerGroupData>();
    data.forEach((row) => {
      const player = players.get(row.memberId);

      if (!player) {
        players.set(row.memberId, row);
      } else {
        if (player.role == 'Competitiespeler') {
          return;
        }

        if (player.role == 'Recreant' && row.role != 'Competitiespeler') {
          return;
        }

        if (player.role == 'Jeugd' && row.role != 'Competitiespeler' && row.role != 'Recreant') {
          return;
        }

        players.set(row.memberId, row);
      }
    });

    return [...players.values()];
  }

  private parseExcelDate(excelDate: number) {
    if (excelDate < 61) excelDate += 1; // lotus123 bugfix
    const utc = new Date((excelDate - 25569) * 8.64e7);
    return {
      year: utc.getUTCFullYear(),
      month: utc.getUTCMonth() + 1,
      day: utc.getUTCDate(),
      hours: utc.getUTCHours(),
      minutes: utc.getUTCMinutes(),
      seconds: utc.getUTCSeconds(),
      milliseconds: utc.getUTCMilliseconds(),
    };
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
  gender: 'V' | 'M';
  groupname: string;
  startdate: number;
  endate: number;
  PlayerLevelSingle: number;
  PlayerLevelDouble: number;
  PlayerLevelMixed: number;
  TypeName: 'Recreant' | 'Jeugd' | 'Competitiespeler';
}
