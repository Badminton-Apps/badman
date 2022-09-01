import {
  Club,
  DrawCompetition,
  EncounterCompetition,
  SubEventCompetition,
  Team,
} from '@badman/backend/database';
import { SubEvent } from '@badman/frontend/models';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { writeFile } from 'fs/promises';
import moment from 'moment';
import { Op } from 'sequelize';

@Injectable()
export class GameExportService {
  private readonly logger = new Logger(GameExportService.name);

  async getGames(year: number, clubId: string) {
    const club = await Club.findByPk(clubId);

    if (!club) {
      throw new NotFoundException(`${Club.name}: ${clubId}`);
    }

    this.logger.log(`Getting games for ${club.name}`);

    const teams = await club.getTeams({
      attributes: ['id'],
    });

    const encounters = await EncounterCompetition.findAll({
      attributes: ['id', 'date'],
      where: {
        date: {
          [Op.between]: [
            moment([year, 8, 1]).toDate(),
            moment([year + 1, 8, 1]).toDate(),
          ],
        },
        [Op.or]: [
          {
            homeTeamId: {
              [Op.in]: teams.map((t) => t.id),
            },
          },
          {
            awayTeamId: {
              [Op.in]: teams.map((t) => t.id),
            },
          },
        ],
      },
      include: [
        { attributes: ['id', 'name'], model: Team, as: 'home' },
        { attributes: ['id', 'name'], model: Team, as: 'away' },
        {
          attributes: ['id'],
          model: DrawCompetition,
          include: [
            { attributes: ['id', 'eventType'], model: SubEventCompetition },
          ],
        },
      ],
      order: [['date', 'ASC']],
      logging: true,
    });

    this.logger.log(`Found ${encounters.length} games`);
    return encounters;
  }

  async gamesExport(year: number, clubId: string) {
    const games = await this.getGames(year, clubId);
    const headers = [
      'Game id',
      'Type',
      'Seizoen',
      'Datum',
      'Start tijdstip',
      'Eind tijdstip',
      'Tijdstip afspraak',
      'Thuisteam',
      'Uitteam',
      'Resource',
      'Part (%)',
      'Omschrijving',
      'Score',
      'Score details',
    ];

    // Write to csv file
    const csv =
      `${headers.join(',')}\n` +
      games
        .map((g) => {
          const date = moment(g.date).format('DD/MM/YYYY');
          const startTime = moment(g.date).format('HH:mm');
          const endTime = moment(g.date).add(2, 'hours').format('HH:mm');

          return `${g.id}, Competitie, ${year}-${
            year + 1
          } ,${date},${startTime},${endTime},,${g.home.name},${
            g.away.name
          },,,,,`;
        })
        .join('\n');

    await writeFile(`${year}-games.csv`, csv);
  }
}
