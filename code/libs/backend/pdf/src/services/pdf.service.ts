/* eslint-disable prefer-rest-params */
import {
  AssemblyData,
  AssemblyValidationService,
} from '@badman/backend-assembly';
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
    const logo = await readFile(`${__dirname}/assets/logo.png`, {
      encoding: 'base64',
    });

    const date = moment(data.encounter.date)
      .tz('Europe/Brussels')
      .format('DD-MM-YYYY HH:mm');

    this.logger.debug(
      `Generating assembly for ${homeTeam.name} vs ${awayTeam.name} on ${date}`
    );

    const indexed = [];
    const based = [];

    const context = {
      date,
      baseIndex: data.meta.competition.teamIndex,
      teamIndex: data.teamIndex,
      homeTeam: homeTeam.name,
      awayTeam: awayTeam.name,
      captain: captain?.fullName,
      doubles: [
        {
          player1: this._processPlayer(data.double1[0], data, indexed, based),
          player2: this._processPlayer(data.double1[1], data, indexed, based),
        },
        {
          player1: this._processPlayer(data.double2[0], data, indexed, based),
          player2: this._processPlayer(data.double2[1], data, indexed, based),
        },
        {
          player1: this._processPlayer(data.double3[0], data, indexed, based),
          player2: this._processPlayer(data.double3[1], data, indexed, based),
        },
        {
          player1: this._processPlayer(data.double4[0], data, indexed, based),
          player2: this._processPlayer(data.double4[1], data, indexed, based),
        },
      ],
      singles: [
        this._processPlayer(data.single1, data, indexed, based),
        this._processPlayer(data.single2, data, indexed, based),
        this._processPlayer(data.single3, data, indexed, based),
        this._processPlayer(data.single4, data, indexed, based),
      ],
      subtitudes: data.subtitudes.map((player) =>
        this._processPlayer(player, data, null, null)
      ),
      type: data.type,
      event: `${
        data.type === 'M' ? 'Heren' : data.type === 'F' ? 'Dames' : 'Gemengd'
      } ${data.draw.name}`,
      isHomeTeam: isHomeTeam,
      logo: `data:image/png;base64, ${logo}`,
      validation,
      errors: validation.errors,
      warnings: validation.warnings,
    };

    return await this.handlebarService.getHtml(
      'pdf/assembly',
      context,
      'assembly'
    );
  }

  private _processPlayer(
    player: Player,
    data: AssemblyData,
    indexed: string[],
    based: string[]
  ): Partial<Player> & {
    base: boolean;
    team: boolean;
    rankingLastPlace: RankingLastPlace;
    sum: number;
    highest: number;
  } {
    if (!player || !player.id) {
      return null;
    }

    const prepped = {
      ...player.toJSON(),
      base: false,
      team: false,
      rankingLastPlace: null,
      sum: 0,
      highest: 0,
    };

    if (
      data.meta.competition.players?.map((p) => p.id).indexOf(player.id) !==
        -1 &&
      based &&
      based.indexOf(player.id) === -1
    ) {
      prepped.base = true;
      based.push(player.id);
    }

    if (
      data.teamPlayers?.map((p) => p.id).indexOf(player.id) !== -1 &&
      indexed &&
      indexed.indexOf(player.id) === -1
    ) {
      prepped.team = true;
      indexed.push(player.id);
    }

    if ((player.rankingPlaces?.length ?? 0) > 0) {
      prepped.sum =
        (player.rankingPlaces[0].single ?? 12) +
        (player.rankingPlaces[0].double ?? 12) +
        (data.type === 'MX' ? player.rankingPlaces[0].mix ?? 12 : 0);

      prepped.highest =
        Math.min(
          player.rankingPlaces[0].single ?? 12,
          player.rankingPlaces[0].double ?? 12,
          data.type === 'MX' ? player.rankingPlaces[0].mix ?? 12 : 12
        ) ?? 12;
    }

    const best = Math.min(
      player.rankingLastPlaces?.[0]?.single ?? 12,
      player.rankingLastPlaces?.[0]?.double ?? 12,
      data.type === 'MX' ? player.rankingLastPlaces?.[0]?.mix ?? 12 : 12
    );

    // if a ranking is not availible use 2 higher then the best ranking but cannot be higher then 12
    // if the best ranking is higher then 12 use 12
    // if no ranking is availible use 12

    const single =
      player.rankingLastPlaces?.[0]?.single ??
      (best < 12 ? (best == 11 ? 12 : best + 12) : 12);
    const double =
      player.rankingLastPlaces?.[0]?.double ??
      (best < 12 ? (best == 11 ? 12 : best + 12) : 12);
    const mix =
      player.rankingLastPlaces?.[0]?.mix ??
      (best < 12 ? (best == 11 ? 12 : best + 12) : 12);

    prepped.rankingLastPlace = {
      single,
      double,
      mix,
    };

    return prepped;
  }
}
