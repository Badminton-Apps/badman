/* eslint-disable prefer-rest-params */
import { promises, writeFileSync } from 'fs';
const { readFile } = promises;
import Handlebars, { compile } from 'handlebars';
import path from 'path';
import puppeteer, { Browser, PDFOptions } from 'puppeteer';
import { Op } from 'sequelize';
import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  EventEntry,
  LastRankingPlace,
  Player,
  RankingPlace,
  SubEventCompetition,
  SubEventType,
  Team,
} from '../../models';
import { logger } from '../../utils';
import moment from 'moment';

export class PdfService {
  constructor() {
    const reduceOp = function (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: any,
      reducer: (
        a: string | boolean | number,
        b: string | boolean | number
      ) => boolean
    ) {
      args = Array.from(args);
      args.pop(); // => options
      const first = args.shift();
      return args.reduce(reducer, first);
    };
    Handlebars.registerHelper({
      eq() {
        return reduceOp(
          arguments,
          (a: string | number, b: string | number) => a === b
        );
      },
      ne() {
        return reduceOp(
          arguments,
          (a: string | number, b: string | number) => a !== b
        );
      },
      lt() {
        return reduceOp(arguments, (a: number, b: number) => a < b);
      },
      gt() {
        return reduceOp(arguments, (a: number, b: number) => a > b);
      },
      lte() {
        return reduceOp(arguments, (a: number, b: number) => a <= b);
      },
      gte() {
        return reduceOp(arguments, (a: number, b: number) => a >= b);
      },
      and() {
        return reduceOp(arguments, (a: boolean, b: boolean) => a && b);
      },
      or() {
        return reduceOp(arguments, (a: boolean, b: boolean) => a || b);
      },
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
      },
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
    const idPlayers = [...input.team?.single, ...input.team?.double.flat(1)];
    const idSubs = input.team?.subtitude;

    const encounter = await EncounterCompetition.findByPk(input.encounterId, {
      include: [
        { model: Team, as: 'home' },
        { model: Team, as: 'away' },
        {
          model: DrawCompetition,
          as: 'draw',
          include: [
            {
              model: SubEventCompetition,
              as: 'subEvent',
              include: [{ model: EventCompetition, as: 'event' }],
            },
          ],
        },
      ],
    });
    const type = encounter.home.type;

    const membership = await EventEntry.findOne({
      where: {
        teamId: input.teamId,
        subEventId: encounter?.draw?.subEvent?.id,
      },
    });

    const meta = membership?.meta;
    const year = encounter.draw.subEvent.event.startYear;

    const players = await Player.findAll({
      where: {
        id: {
          [Op.in]: idPlayers,
        },
      },
      include: [
        { model: LastRankingPlace },
        {
          model: RankingPlace,
          limit: 1,
          where: {
            rankingDate: `${year}-05-15`,
          },
        },
      ],
    });

    const subs = await Player.findAll({
      where: {
        id: {
          [Op.in]: idSubs,
        },
      },
      include: [
        { model: LastRankingPlace },
        {
          model: RankingPlace,
          limit: 1,
          where: {
            rankingDate: `${year}-05-15`,
          },
        },
      ],
    });

    const captain = await Player.findByPk(input.captainId);

    const teamIndex = this._teamIndex(players, type);
    const preppedMap = new Map<
      string,
      Partial<Player> & {
        base: boolean;
        team: boolean;
        lastRankingPlace: LastRankingPlace;
        sum: number;
        highest: number;
      }
    >();

    players.concat(subs).forEach((player) => {
      const mayIndex = player.rankingPlaces[0] ?? {
        single: 12,
        double: 12,
        mix: 12,
      };

      preppedMap.set(player.id, {
        ...player.toJSON(),
        lastRankingPlace: player.lastRankingPlaces[0].toJSON(),
        base: !!meta?.competition?.players?.find((p) => p?.id === player.id)
          ?.id,
        team: !!teamIndex.players.find((p) => p?.id === player.id),
        sum:
          mayIndex.single +
          mayIndex.double +
          (type === 'MX' ? mayIndex.mix : 0),
        highest: Math.min(
          mayIndex.single,
          mayIndex.double,
          type === 'MX' ? mayIndex.mix : 12
        ),
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
      ),
    ];

    const singles = [
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[0])
        .player1,
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[1])
        .player1,
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[2])
        .player1,
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[3])
        .player1,
    ];

    const subtitudes = input.team.subtitude.map(
      (r) => this._addPlayer(preppedMap, based, teamed, r)?.player1
    );

    const logo = await readFile(`${__dirname}/assets/logo.png`, {
      encoding: 'base64',
    });
    const options = {
      date: moment(encounter.date).format('DD-MM-YYYY HH:mm'),
      baseIndex: meta?.competition?.teamIndex,
      teamIndex: teamIndex.index,
      homeTeam: encounter.home.name,
      awayTeam: encounter.away.name,
      captain: captain?.fullName,
      doubles,
      singles,
      subtitudes,
      type,
      event: `${type === 'M' ? 'Heren' : type === 'F' ? 'Dames' : 'Gemengd'} ${
        encounter.draw.name
      }`,
      isHomeTeam: encounter.homeTeamId === input.teamId,
      logo: `data:image/png;base64, ${logo}`,
    };

    const pdf = await this._htmlToPdf('assembly', options, {
      format: 'a4',
      landscape: true,
      printBackground: true,
    });

    return pdf;
  }

  private _addPlayer(
    preppedMap: Map<
      string,
      Partial<Player> & {
        base: boolean;
        team: boolean;
        lastRankingPlace: LastRankingPlace;
        sum: number;
        highest: number;
      }
    >,
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
      player2,
    };
  }

  private async _htmlToPdf(
    templatePath: string,
    data: unknown,
    options: PDFOptions
  ) {
    let browser: Browser;
    try {
      if (!browser) {
        browser = await puppeteer.launch({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
          headless: true,
        });
      }
      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();
      const content = await this._compile(templatePath, data);
      await page.goto(`data: text/html, ${content}`, {
        waitUntil: 'networkidle0',
      });
      await page.setContent(content);
      const pdf = await page.pdf(options);

      writeFileSync('assembly.html', await page.content());

      await context.close();
      return pdf;
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }

  private async _compile(templateName: string, context: unknown) {
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
            (b.rankingPlaces[0]?.single ?? 12) +
            (b.rankingPlaces[0]?.double ?? 12),
          missingIndex
        ),
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
            (b.rankingPlaces[0]?.single ?? 12) +
            (b.rankingPlaces[0]?.double ?? 12) +
            (b.rankingPlaces[0]?.mix ?? 12),
          missingIndex
        ),
      };
    }
  }

  private _bestPlayers(players: Player[], type: SubEventType) {
    let bestPlayers = [];
    if (type === SubEventType.MX) {
      bestPlayers = [
        ...players
          .filter((p) => p.gender === 'M')
          .sort(
            (b, a) =>
              (b.rankingPlaces[0]?.single ?? 12) +
              (b.rankingPlaces[0]?.double ?? 12) +
              (b.rankingPlaces[0]?.mix ?? 12) -
              ((a.rankingPlaces[0]?.single ?? 12) +
                (a.rankingPlaces[0]?.double ?? 12) +
                (a.rankingPlaces[0]?.mix ?? 12))
          )
          .slice(0, 2),
        ...players
          .filter((p) => p.gender === 'F')
          .sort(
            (b, a) =>
              (b.rankingPlaces[0]?.single ?? 12) +
              (b.rankingPlaces[0]?.double ?? 12) +
              (b.rankingPlaces[0]?.mix ?? 12) -
              ((a.rankingPlaces[0]?.single ?? 12) +
                (a.rankingPlaces[0]?.double ?? 12) +
                (a.rankingPlaces[0]?.mix ?? 12))
          )
          .slice(0, 2),
      ];
    } else {
      bestPlayers = players
        .sort(
          (b, a) =>
            (b.rankingPlaces[0]?.single ?? 12) +
            (b.rankingPlaces[0]?.double ?? 12) -
            ((a.rankingPlaces[0]?.single ?? 12) +
              (a.rankingPlaces[0]?.double ?? 12))
        )
        .slice(0, 4);
    }

    return bestPlayers;
  }
}
