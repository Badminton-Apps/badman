/* eslint-disable prefer-rest-params */
import { AssemblyValidationService } from '@badman/backend-assembly';
import { Player, RankingLastPlace, Team } from '@badman/backend-database';
import { HandlebarService } from '@badman/backend-handlebar';
import { Injectable, Logger } from '@nestjs/common';
import { promises } from 'fs';
import moment from 'moment-timezone';
const { readFile } = promises;

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  constructor(
    private handlebarService: HandlebarService,
    private assemblyService: AssemblyValidationService
  ) {}

  async getTeamAssemblyPdf(input: {
    systemId: string;
    captainId: string;
    teamId: string;
    encounterId: string;

    single1: string;
    single2: string;
    single3: string;
    single4: string;
    double1: string[];
    double2: string[];
    double3: string[];
    double4: string[];

    subtitudes: string[];
  }) {
    const data = await this.assemblyService.getValidationData(
      input.systemId,
      input.teamId,
      input.encounterId,
      input.single1,
      input.single2,
      input.single3,
      input.single4,
      input.double1,
      input.double2,
      input.double3,
      input.double4,
      input.subtitudes
    );

    const validation = await this.assemblyService.validate(data, []);

    let homeTeam: Team;
    let awayTeam: Team;
    let isHomeTeam: boolean;

    if (data.encounter.homeTeamId == input.teamId) {
      homeTeam = data.team;
      awayTeam = await data.encounter.getAway({
        attributes: ['id', 'name'],
      });
      isHomeTeam = true;
    } else {
      homeTeam = await data.encounter.getHome({
        attributes: ['id', 'name'],
      });
      awayTeam = data.team;
      isHomeTeam = false;
    }

    const captain = await Player.findByPk(input.captainId);
    const players = [
      data.single1,
      data.single2,
      data.single3,
      data.single4,
      ...data.double1,
      ...data.double2,
      ...data.double3,
      ...data.double4,
    ];

    const teamIndex = Team.baseTeam(players, data.type);
    const preppedMap = new Map<
      string,
      Partial<Player> & {
        base: boolean;
        team: boolean;
        rankingLastPlace: RankingLastPlace;
        sum: number;
        highest: number;
      }
    >();

    players
      ?.concat(data.subtitudes)
      ?.filter((p) => !!p)
      ?.forEach((player) => {
        const mayIndex = player.rankingPlaces[0] ?? {
          single: 12,
          double: 12,
          mix: 12,
        };

        preppedMap.set(player.id, {
          ...player.toJSON(),
          rankingLastPlace: player.rankingLastPlaces?.[0]?.toJSON(),
          base: !!data.meta?.competition?.players?.find(
            (p) => p?.id === player.id
          )?.id,
          team: !!teamIndex.players.find((p) => p?.id === player.id),
          sum:
            mayIndex.single +
            mayIndex.double +
            (data.type === 'MX' ? mayIndex.mix : 0),
          highest: Math.min(
            mayIndex.single,
            mayIndex.double,
            data.type === 'MX' ? mayIndex.mix : 12
          ),
        });
      });

    const based: string[] = [];
    const titularis: string[] = [];

    const doubles = [
      this._addPlayer(
        preppedMap,
        based,
        titularis,
        input.double1?.[0],
        input.double1?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        titularis,
        input.double2?.[0],
        input.double2?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        titularis,
        input.double3?.[0],
        input.double3?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        titularis,
        input.double4?.[0],
        input.double4?.[1]
      ),
    ];

    const singles = [
      this._addPlayer(preppedMap, based, titularis, input.single1).player1,
      this._addPlayer(preppedMap, based, titularis, input.single2).player1,
      this._addPlayer(preppedMap, based, titularis, input.single3).player1,
      this._addPlayer(preppedMap, based, titularis, input.single4).player1,
    ];

    const subs =
      input.subtitudes?.map(
        (r) => this._addPlayer(preppedMap, based, titularis, r)?.player1
      ) ?? [];

    const logo = await readFile(`${__dirname}/assets/logo.png`, {
      encoding: 'base64',
    });

    const date = moment(data.encounter.date)
      .tz('Europe/Brussels')
      .format('DD-MM-YYYY HH:mm');

    this.logger.debug(
      `Generating assembly for ${homeTeam.name} vs ${awayTeam.name} on ${date}`
    );

    const context = {
      date,
      baseIndex: data.meta?.competition?.teamIndex,
      teamIndex: teamIndex.index,
      homeTeam: homeTeam.name,
      awayTeam: awayTeam.name,
      captain: captain?.fullName,
      doubles,
      singles,
      subtitudes: subs,
      type: data.type,
      event: `${
        data.type === 'M' ? 'Heren' : data.type === 'F' ? 'Dames' : 'Gemengd'
      } ${data.draw.name}`,
      isHomeTeam: isHomeTeam,
      logo: `data:image/png;base64, ${logo}`,
      validation,
    };

    return await this.handlebarService.getHtml(
      'pdf/assembly',
      context,
      'assembly'
    );
  }

  private _addPlayer(
    preppedMap: Map<
      string,
      Partial<Player> & {
        base: boolean;
        team: boolean;
        rankingLastPlace: RankingLastPlace;
        sum: number;
        highest: number;
      }
    >,
    based: string[],
    titularis: string[],
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

      if (player1.team && titularis.indexOf(player1.id) === -1) {
        titularis.push(player1.id);
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

      if (player2.team && titularis.indexOf(player2.id) === -1) {
        titularis.push(player2.id);
      } else {
        player2.team = false;
      }
    }
    return {
      player1,
      player2,
    };
  }
}
