import {
  Club,
  DrawCompetition,
  EncounterCompetition,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import moment from 'moment-timezone';
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
      attributes: ['id', 'date', 'homeScore', 'awayScore'],
      where: {
        date: {
          [Op.between]: [moment([year, 8, 1]).toDate(), moment([year + 1, 8, 1]).toDate()],
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
          include: [{ attributes: ['id', 'eventType'], model: SubEventCompetition }],
        },
      ],
      order: [['date', 'ASC']],
    });

    this.logger.log(`Found ${encounters.length} games`);
    return encounters;
  }

  async gamesExport(year: number, clubId: string) {
    const games = await this.getGames(year, clubId);

    // Write to csv file
    return games.map((game) => {
      const homeTeam = game.home as Team;
      const awayTeam = game.away as Team;

      return {
        'Game id': game.id,
        Type: 'Competitie',
        Seizoen: `${year}-${parseInt(`${year}`) + 1}`,
        Datum: moment.tz(game.date, 'Europe/Brussels').format('DD/MM/YYYY'),
        'Start tijdstip': moment.tz(game.date, 'Europe/Brussels').format('HH:mm'),
        'Eind tijdstip': moment.tz(game.date, 'Europe/Brussels').add(2, 'hours').format('HH:mm'),
        'Tijdstip afspraak': moment
          .tz(game.date, 'Europe/Brussels')
          .subtract(15, 'minute')
          .format('HH:mm'),
        Thuisteam: homeTeam.name,
        Uitteam: awayTeam.name,
        Resource: null,
        'Part (%)': null,
        Omschrijving: null,
        Score: game.homeScore && game.awayScore ? `${game.homeScore} - ${game.awayScore}` : null,
        'Score details': null,
      };
    });
  }
}
