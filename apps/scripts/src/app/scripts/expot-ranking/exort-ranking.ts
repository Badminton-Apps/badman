import {
  Club,
  Player,
  RankingLastPlace,
  RankingSystem,
} from '@badman/backend-database';
import { ClubMembershipType, getCurrentSeasonPeriod } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import xlsx from 'xlsx';

@Injectable()
export class ExportBBFPlayers {
  output: {
    'First Name'?: string;
    'Last Name'?: string;
    'Member id'?: string;
    Club?: string;
    'Single Ranking': string;
    'Upgrade only': string;
    'Downgrade only': string;
    'Double classification': string;
    'Double upgrade': string;
    'Double downgrade': string;
    'Mix ranking': string;
    'Mix upgrade': string;
    'Mix downgrade': string;
    'Only #competition': string;
    'Only #Tournaments': string;
    'Single # Total': string;
    'Double # Competition': string;
    'Double # Tournament': string;
    'Double # Total': string;
    'Mix # Competition': string;
    'Mix # Tournament': string;
    'Mix # Total': string;
  }[] = [];

  private readonly logger = new Logger(ExportBBFPlayers.name);
  constructor(private _sequelize: Sequelize) {
    this.logger.log('ExportBBFPlayers');
  }

  async process(season: number) {
    // create an excel to track all actions

    try {
      this.logger.verbose(`Exporting players`);

      const system = await RankingSystem.findOne({
        where: {
          primary: true,
        },
      });
      if (!system) {
        throw new Error('No primary ranking system found');
      }

      const players = await this.loadPlayers(season, system);
    } catch (error) {
      this.logger.error(error);
    }
  }

  async loadPlayers(season: number, system: RankingSystem, onlyComp = true) {
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
      TypeName: string;
      PlayerLevelSingle: string;
      PlayerLevelDouble: string;
      PlayerLevelMixed: string;
    }>(playersSheet);

    playersJson = playersJson
      ?.filter(
        (c) =>
          c.memberid != null &&
          c.memberid != '' &&
          c.memberid != undefined &&
          (onlyComp ? c.TypeName == 'Competitiespeler' : true)
      )
      ?.slice(0, 10);

    const players = await Player.findAll({
      attributes: ['id', 'firstName', 'lastName', 'memberId'],
      where: {
        [Op.or]: [
          { memberId: playersJson?.map((c) => c.memberid) },
          {
            // always include me for debugging
            slug: 'glenn-latomme',
          },
        ],
      },
      include: [
        {
          model: Club,
          attributes: ['id', 'name'],
          through: {
            where: {
              end: null,
              membershipType: ClubMembershipType.NORMAL,
            },
          },
        },
        {
          model: RankingLastPlace,
          attributes: [
            'singlePoints',
            'mixPoints',
            'doublePoints',
            'singlePointsDowngrade',
            'mixPointsDowngrade',
            'doublePointsDowngrade',
            'single',
            'mix',
            'double',
          ],
          where: {
            systemId: system.id,
          },
        },
      ],
    });

    return players;
  }

  async getGames(season: number, system: RankingSystem, players: Player[]) {
    const period = getCurrentSeasonPeriod(season);
    const [start, stop] = period;
  }
}
