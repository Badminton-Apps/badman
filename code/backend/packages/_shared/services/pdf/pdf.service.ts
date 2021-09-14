import { promises } from 'fs';
const { readFile } = promises;
import { compile, registerHelper } from 'handlebars';
import path from 'path';
import puppeteer, { Browser, PDFOptions } from 'puppeteer';
import { Op } from 'sequelize';
import { DataBaseHandler } from '../../database';
import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  LastRankingPlace,
  Player,
  RankingPlace,
  SubEventCompetition,
  SubEventType,
  Team,
  TeamSubEventMembership
} from '../../models';
import { logger } from '../../utils';
import moment from 'moment';

export class PdfService {
  constructor(private _databaseService: DataBaseHandler) {
     /* eslint-disable prefer-arrow/prefer-arrow-functions */
     const reduceOp = function(args, reducer) {
      args = Array.from(args);
      args.pop(); // => options
      const first = args.shift();
      return args.reduce(reducer, first);
    };

    registerHelper({
      eq() {
        return reduceOp(arguments, (a, b) => a === b);
      },
      ne() {
        return reduceOp(arguments, (a, b) => a !== b);
      },
      lt() {
        return reduceOp(arguments, (a, b) => a < b);
      },
      gt() {
        return reduceOp(arguments, (a, b) => a > b);
      },
      lte() {
        return reduceOp(arguments, (a, b) => a <= b);
      },
      gte() {
        return reduceOp(arguments, (a, b) => a >= b);
      },
      and() {
        return reduceOp(arguments, (a, b) => a && b);
      },
      or() {
        return reduceOp(arguments, (a, b) => a || b);
      },
      /* eslint-enable prefer-arrow/prefer-arrow-functions */
      labelSingle: (index, type) => {
        if (type === 'MX') {
          if (index === 0) {
            return 'HE 1';
          } else if (index === 1) {
            return 'HE 2';
          } else if (index === 2) {
            return 'DE 1';
          } else if (index === 3) {
            return 'DE 2';
          }
        } else {
          const prefix = type === 'M' ? 'HE' : 'DE';
          return `${prefix} ${index + 1}`;
        }
      },
      labelDouble: (index, type) => {
        if (type === 'MX') {
          if (index === 0) {
            return 'HD';
          } else if (index === 1) {
            return 'DD';
          } else if (index === 2) {
            return 'GD 1';
          } else if (index === 3) {
            return 'GD 2';
          }
        } else {
          const prefix = type === 'M' ? 'HD' : 'DD';
          return `${prefix} ${index + 1}`;
        }
      }
    });
  }

  async getTeamAssemblyPdf(input: {
    captainId: string;
    teamId: string;
    encounterId: string;
    team: {
      single: string[];
      double: string[][];
      subtitude: string[];
    };
  }) {
    const ids = [
      ...input.team?.single,
      ...input.team?.double.flat(1),
      ...input.team?.subtitude
    ];

    const encounter = await EncounterCompetition.findByPk(input.encounterId, {
      include: [
        { model: Team, as: 'home' },
        { model: Team, as: 'away' },
        {
          model: DrawCompetition,
          include: [
            {
              model: SubEventCompetition,
              include: [{ model: EventCompetition }]
            }
          ]
        }
      ]
    });
    const type = encounter.home.type;

    const meta = (
      await TeamSubEventMembership.findOne({
        where: {
          teamId: input.teamId,
          subEventId: encounter?.draw?.subEvent?.id
        }
      })
    )?.meta;
    const today = moment();
    const year = today.month() >= 6 ? today.year() : today.year() - 1;
    const players = await Player.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      },
      include: [
        { model: LastRankingPlace },
        {
          model: RankingPlace,
          where: {
            rankingDate: `${year}-05-15`
          }
        }
      ]
    });

    const captain = await Player.findByPk(input.captainId);

    const teamIndex = this._teamIndex(players, type);
    const preppedMap = new Map<string, any>();

    players.forEach(player => {
      const mayIndex = player.rankingPlaces[0] ?? {
        single: 12,
        double: 12,
        mix: 12
      };

      preppedMap.set(player.id, {
        ...player.toJSON(),
        base: !!meta?.players?.find(p => p?.id === player.id)?.id,
        team: !!teamIndex.players.find(p => p?.id === player.id),
        sum:
          mayIndex.single +
          mayIndex.double +
          (type === 'MX' ? mayIndex.mix : 0),
        highest: Math.min(
          mayIndex.single,
          mayIndex.double,
          type === 'MX' ? mayIndex.mix : 12
        )
      });
    });

    const based: string[] = [];
    const teamed: string[] = [];

    const doubles = [
      this._addPlayer(
        preppedMap,
        based,
        teamed,
        input.team.double?.[0]?.[0],
        input.team.double?.[0]?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        teamed,
        input.team.double?.[1]?.[0],
        input.team.double?.[1]?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        teamed,
        input.team.double?.[2]?.[0],
        input.team.double?.[2]?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        teamed,
        input.team.double?.[3]?.[0],
        input.team.double?.[3]?.[1]
      )
    ];

    const singles = [
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[0])
        .player1,
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[1])
        .player1,
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[2])
        .player1,
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[3]).player1
    ];

    const subtitudes = input.team.subtitude.map(
      r => this._addPlayer(preppedMap, based, teamed, r)?.player1
    );

    const logo = await readFile(`${__dirname}/assets/logo.png`, {
      encoding: 'base64'
    });

    const pdf = await this._htmlToPdf(
      'assembly',
      {
        date: moment(encounter.date).format('DD-MM-YYYY HH:mm'),
        baseIndex: meta?.teamIndex,
        teamIndex: teamIndex.index,
        homeTeam: encounter.home.name,
        awayTeam: encounter.away.name,
        captain: captain.fullName,
        doubles,
        singles,
        subtitudes,
        type,
        event: `${
          type === 'M' ? 'Heren' : type === 'F' ? 'Dames' : 'Gemengd'
        } ${encounter.draw.name}`,
        isHomeTeam: encounter.homeTeamId === input.teamId,
        logo: `data:image/png;base64, ${logo}`
      },
      {
        format: 'a4',
        landscape: true,
        printBackground: true
      }
    );

    return pdf;
  }

  private _addPlayer(
    preppedMap: Map<string, any>,
    based: string[],
    teamed: string[],
    player1Id = '',
    player2Id = ''
  ) {
    const player1 = { ...preppedMap.get(player1Id) };
    const player2 = { ...preppedMap.get(player2Id) };

    if (player1) {
      if (player1.base && based.indexOf(player1.id) === -1) {
        based.push(player1.id);
      } else {
        player1.base = false;
      }

      if (player1.team && teamed.indexOf(player1.id) === -1) {
        teamed.push(player1.id);
      } else {
        player1.team = false;
      }
    }

    if (player2) {
      if (player2.base && based.indexOf(player2.id) === -1) {
        based.push(player2.id);
      } else {
        player2.base = false;
      }

      if (player2.team && teamed.indexOf(player2.id) === -1) {
        teamed.push(player2.id);
      } else {
        player2.team = false;
      }
    }
    return {
      player1,
      player2
    };
  }

  private async _htmlToPdf(
    templatePath: string,
    data: any,
    options: PDFOptions
  ) {
    let browser: Browser;
    try {
      if (!browser) {
        browser = await puppeteer.launch({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ],
          headless: true
        });
      }
      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();
      const content = await this._compile(templatePath, data);
      await page.goto(`data: text/html, ${content}`, {
        waitUntil: 'networkidle0'
      });
      await page.setContent(content);
      const pdf = await page.pdf(options);

      await context.close();
      return pdf;
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }

  private async _compile(templateName, context) {
    const filePath = path.join(
      __dirname,
      'templates',
      `${templateName}.handlebars`
    );
    if (!filePath) {
      throw new Error(`Could not find ${templateName}.hbs in generatePDF`);
    }
    const html = await readFile(filePath, 'utf-8');
    return compile(html)(context);
  }

  private _teamIndex(players: Player[], type: SubEventType) {
    const bestPlayers = this._bestPlayers(players, type);

    if (type !== 'MX') {
      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length) * 24;
      }

      return {
        players: bestPlayers,
        index: bestPlayers.reduce(
          (a, b) =>
            a +
            (b.lastRankingPlace?.single ?? 12) +
            (b.lastRankingPlace?.double ?? 12),
          missingIndex
        )
      };
    } else {
      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length) * 36;
      }

      return {
        players: bestPlayers,
        index: bestPlayers.reduce(
          (a, b) =>
            a +
            (b.lastRankingPlace?.single ?? 12) +
            (b.lastRankingPlace?.double ?? 12) +
            (b.lastRankingPlace?.mix ?? 12),
          missingIndex
        )
      };
    }
  }

  private _bestPlayers(players: Player[], type: SubEventType) {
    let bestPlayers = [];
    if (type === SubEventType.MX) {
      bestPlayers = [
        ...players
          .filter(p => p.gender === 'M')
          .sort(
            (b, a) =>
              (b.lastRankingPlace?.single ?? 12) +
              (b.lastRankingPlace?.double ?? 12) +
              (b.lastRankingPlace?.mix ?? 12) -
              ((a.lastRankingPlace?.single ?? 12) +
                (a.lastRankingPlace?.double ?? 12) +
                (a.lastRankingPlace?.mix ?? 12))
          )
          .slice(0, 2),
        ...players
          .filter(p => p.gender === 'F')
          .sort(
            (b, a) =>
              (b.lastRankingPlace?.single ?? 12) +
              (b.lastRankingPlace?.double ?? 12) +
              (b.lastRankingPlace?.mix ?? 12) -
              ((a.lastRankingPlace?.single ?? 12) +
                (a.lastRankingPlace?.double ?? 12) +
                (a.lastRankingPlace?.mix ?? 12))
          )
          .slice(0, 2)
      ];
    } else {
      bestPlayers = players
        .sort(
          (b, a) =>
            (b.lastRankingPlace?.single ?? 12) +
            (b.lastRankingPlace?.double ?? 12) -
            ((a.lastRankingPlace?.single ?? 12) +
              (a.lastRankingPlace?.double ?? 12))
        )
        .slice(0, 4);
    }

    return bestPlayers;
  }
}
