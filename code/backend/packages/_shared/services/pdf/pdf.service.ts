import { readFile, writeFile } from 'fs/promises';
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
    registerHelper({
      eq: (v1, v2) => v1 === v2,
      ne: (v1, v2) => v1 !== v2,
      lt: (v1, v2) => v1 < v2,
      gt: (v1, v2) => v1 > v2,
      lte: (v1, v2) => v1 <= v2,
      gte: (v1, v2) => v1 >= v2,
      and() {
        return Array.prototype.every.call(arguments, Boolean);
      },
      or() {
        return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
      },
      labelSingle: (index, type) => {
        if (type == 'MX') {
          if (index == 0) {
            return 'HE 1';
          } else if (index == 1) {
            return 'HE 2';
          } else if (index == 2) {
            return 'DE 1';
          } else if (index == 3) {
            return 'DE 2';
          }
        } else {
          const prefix = type == 'M' ? 'HE' : 'DE';
          return `${prefix} ${index + 1}`;
        }
      },
      labelDouble: (index, type) => {
        if (type == 'MX') {
          if (index == 0) {
            return 'HD';
          } else if (index == 1) {
            return 'DD';
          } else if (index == 2) {
            return 'GD 1';
          } else if (index == 3) {
            return 'GD 2';
          }
        } else {
          const prefix = type == 'M' ? 'HE' : 'DE';
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
    // const captainId = 'c2140fa9-6ea6-4a41-9c7d-c7d27aed14bd';
    // const ids = [
    //   '23ceec83-6b4f-4525-9db5-4e77f3876570', // Jan
    //   'c2140fa9-6ea6-4a41-9c7d-c7d27aed14bd', // Shane
    //   '38ae9f3a-95cd-48f6-a101-84fdc8a59924', // Stijn
    //   'de7116a3-1908-4f75-8dd1-c0c01fcba820', // Carlo
    //   'e8168502-8fdd-4584-9f82-28ae21b55d33', // Boris
    //   '90fcc155-3952-4f58-85af-f90794165c89', // Glenn
    //   '06def4fc-6442-4646-a017-f11d7d61eeaf', // Hannes
    //   '5af81423-acfb-4f2a-9aa6-13b47d296d83', // Mario.
    //   'def9c355-4625-4499-83a3-4ceb8a2ca6cd', // Koen
    //   captainId
    // ];
    // const teamId = 'fd40028b-8e23-4b57-b724-156d380b49e8';
    // const encounterId = '59acd6ba-6dc7-4b4a-b4af-75b2ed4aa721';

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
      var mayIndex = player.rankingPlaces[0] ?? {
        single: 12,
        double: 12,
        mix: 12
      };

      preppedMap.set(player.id, {
        ...player.toJSON(),
        base: !!meta?.players?.find(p => p?.playerId == player.id)?.playerId,
        team: !!teamIndex.players.find(p => p?.id == player.id),
        sum:
          mayIndex.single + mayIndex.double + (type == 'MX' ? mayIndex.mix : 0),
        highest: Math.min(
          mayIndex.single,
          mayIndex.double,
          type == 'MX' ? mayIndex.mix : 12
        )
      });
    });

    var based: string[] = [];
    var teamed: string[] = [];

    const doubles = [
      this.add_player(
        preppedMap,
        based,
        teamed,
        input.team.double?.[0]?.[0],
        input.team.double?.[0]?.[1]
      ),
      this.add_player(
        preppedMap,
        based,
        teamed,
        input.team.double?.[1]?.[0],
        input.team.double?.[1]?.[1]
      ),
      this.add_player(
        preppedMap,
        based,
        teamed,
        input.team.double?.[2]?.[0],
        input.team.double?.[2]?.[1]
      ),
      this.add_player(
        preppedMap,
        based,
        teamed,
        input.team.double?.[3]?.[0],
        input.team.double?.[3]?.[1]
      )
    ];

    const singles = [
      this.add_player(preppedMap, based, teamed, input.team.single?.[0])
        .player1,
      this.add_player(preppedMap, based, teamed, input.team.single?.[1])
        .player1,
      this.add_player(preppedMap, based, teamed, input.team.single?.[2])
        .player1,
      this.add_player(preppedMap, based, teamed, input.team.single?.[3]).player1
    ];

    const subtitudes = input.team.subtitude.map(
      r => this.add_player(preppedMap, based, teamed, r)?.player1
    );

    var logo = await readFile(`${__dirname}/assets/logo.png`, {
      encoding: 'base64'
    });

    let pdf = await this._htmlToPdf(
      'assembly',
      {
        date: moment(encounter.date).format('DD-MM-YYYY HH:mm'),
        baseIndex: meta?.teamIndex,
        teamIndex: teamIndex.index,
        homeTeam: encounter.home.name,
        awayTeam: encounter.away.name,
        captain: captain.fullName,
        doubles: doubles,
        singles: singles,
        subtitudes: subtitudes,
        type: type,
        event: `${type == 'M' ? 'Heren' : type == 'F' ? 'Dames' : 'Gemengd'} ${
          encounter.draw.name
        }`,
        isHomeTeam: encounter.homeTeamId == input.teamId,
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

  private add_player(
    preppedMap: Map<string, any>,
    based: string[],
    teamed: string[],
    player1Id = '',
    player2Id = ''
  ) {
    const player1 = { ...preppedMap.get(player1Id) };
    const player2 = { ...preppedMap.get(player2Id) };

    if (player1) {
      if (player1.base && based.indexOf(player1.id) == -1) {
        based.push(player1.id);
      } else {
        player1.base = false;
      }

      if (player1.team && teamed.indexOf(player1.id) == -1) {
        teamed.push(player1.id);
      } else {
        player1.team = false;
      }
    }

    if (player2) {
      if (player2.base && based.indexOf(player2.id) == -1) {
        based.push(player2.id);
      } else {
        player2.base = false;
      }

      if (player2.team && teamed.indexOf(player2.id) == -1) {
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
      const html = await page.content();
      const pdf = await page.pdf(options);

      await writeFile('test.html', html, { encoding: 'utf-8', flag: 'w' });

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
    var bestPlayers = [];
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
