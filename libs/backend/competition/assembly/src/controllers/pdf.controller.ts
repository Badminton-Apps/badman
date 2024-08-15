import { User } from '@badman/backend-authorization';
import { CompileService } from '@badman/backend-compile';
import { Logging, Player, RankingLastPlace, Team } from '@badman/backend-database';
import { I18nTranslations, LoggingAction, SubEventTypeEnum, gameLabel } from '@badman/utils';
import { Controller, Logger, Post, Req, Res, StreamableFile } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { readFile } from 'fs/promises';
import moment from 'moment-timezone';
import { I18nService } from 'nestjs-i18n';
import { lastValueFrom, take } from 'rxjs';
import { AssemblyValidationData, AssemblyValidationError } from '../models';
import { AssemblyValidationService } from '../services';

type gameType =
  | 'single1'
  | 'single2'
  | 'single3'
  | 'single4'
  | 'double1'
  | 'double2'
  | 'double3'
  | 'double4';

type inputBody = {
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
};

@Controller({
  path: 'pdf/assembly',
})
export class AssemblyController {
  private readonly logger = new Logger(AssemblyController.name);

  constructor(
    private readonly compileService: CompileService,
    private readonly assemblyService: AssemblyValidationService,
    private readonly i18nService: I18nService<I18nTranslations>,
  ) {}

  @Post('team')
  async teamAssembly(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @User() user: Player,
  ) {
    // compile the template that returns a buffer of the pdf
    const pdf$ = await this.getTeamAssemblyPdf(req.body as inputBody, user);

    if (!pdf$) {
      throw new Error('Pdf could not be generated');
    }

    // get the buffer from the observable
    const pdf = await lastValueFrom(pdf$);

    // set the content type to pdf
    res.header('Content-Type', 'application/pdf');

    // write to log
    await Logging.create({
      action: LoggingAction.AssemblyDownloaded,
      playerId: user?.id,
      meta: req.body,
    });

    // return the pdf as a streamable file
    return new StreamableFile(pdf);
  }

  private async getTeamAssemblyPdf(input: inputBody, user: Player) {
    const data = await this.assemblyService.fetchData(input);
    const validation = await this.assemblyService.validate(input, {
      playerId: user.id,
    });

    let homeTeam: Team;
    let awayTeam: Team | null;
    let isHomeTeam: boolean;

    if (!data?.team) {
      return;
    }

    if (data.encounter) {
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
    } else {
      homeTeam = data.team;
      awayTeam = null;
      isHomeTeam = true;
    }

    const captain = await Player.findByPk(input.captainId);
    const logo = await readFile(`${__dirname}/compile/libs/assembly/images/logo.png`, {
      encoding: 'base64',
    });

    const date = moment(data.encounter?.date).tz('Europe/Brussels').format('DD-MM-YYYY HH:mm');

    this.logger.debug(
      `Generating assembly for ${homeTeam.name} vs ${awayTeam?.name ?? 'empty'} on ${date}`,
    );

    const indexed: string[] = [];
    const based: string[] = [];

    const errors = validation.errors?.map((error) => {
      this.translateGame(error);
      const translated = this.i18nService.translate(error.message, {
        debug: true,
        args: error.params as never,
      });
      return translated;
    });

    const warnings = validation.warnings?.map((warn) => {
      this.translateGame(warn);

      const translated = this.i18nService.translate(warn.message, {
        debug: true,
        args: warn.params as never,
      });
      return translated;
    });

    const context = {
      date,
      baseIndex: data.meta?.competition?.teamIndex,
      teamIndex: data.teamIndex,
      homeTeam: homeTeam.name,
      awayTeam: awayTeam?.name ?? 'Onbekend',
      captain: captain?.fullName,
      generationDate: moment().tz('Europe/Brussels').format('DD-MM-YYYY HH:mm'),
      rankingDate: moment(data.system?.updateLastUpdate).tz('Europe/Brussels').format('DD-MM-YYYY'),
      gameLabels: this.getLabels(data),
      doubles: [
        {
          player1: this._processPlayer(data, indexed, based, data.double1?.[0]),
          player2: this._processPlayer(data, indexed, based, data.double1?.[1]),
        },
        {
          player1: this._processPlayer(data, indexed, based, data.double2?.[0]),
          player2: this._processPlayer(data, indexed, based, data.double2?.[1]),
        },
        {
          player1: this._processPlayer(data, indexed, based, data.double3?.[0]),
          player2: this._processPlayer(data, indexed, based, data.double3?.[1]),
        },
        {
          player1: this._processPlayer(data, indexed, based, data.double4?.[0]),
          player2: this._processPlayer(data, indexed, based, data.double4?.[1]),
        },
      ],
      singles: [
        this._processPlayer(data, indexed, based, data.single1),
        this._processPlayer(data, indexed, based, data.single2),
        this._processPlayer(data, indexed, based, data.single3),
        this._processPlayer(data, indexed, based, data.single4),
      ],
      subtitudes: data.subtitudes?.map((player) => this._processPlayer(data, [], [], player)),
      type: data.type,
      event: `${data.type === 'M' ? 'Heren' : data.type === 'F' ? 'Dames' : 'Gemengd'} ${data.draw?.name}`,
      isHomeTeam: isHomeTeam,
      validation: {
        ...validation,
        errors,
        warnings,
      },
      exception: null,
      logo: `data:image/png;base64, ${logo}`,
    };

    // check if any player has an exception
    if (
      context.singles?.find((p) => p?.exception) ||
      context.doubles?.find((p) => p?.player1?.exception) ||
      context.doubles?.find((p) => p?.player2?.exception)
    ) {
      context.exception = this.i18nService.translate(
        'all.competition.team-assembly.level-exemption',
      );
    }

    return this.compileService
      .toBuffer('assembly', {
        locals: context,
        pdf: {
          format: 'A4',
          landscape: true,
        },
      })
      .pipe(take(1));
  }

  private translateGame(warn: AssemblyValidationError<unknown>) {
    const params: Record<string, unknown> = (warn.params || {}) as Record<string, unknown>;

    const games = params['game'] as gameType;
    if (games != undefined) {
      params['game'] = this.i18nService
        .translate(`all.competition.team-assembly.${games}`)
        .toLocaleLowerCase();
    }

    const games1 = params['game1'] as gameType;
    if (games1 != undefined) {
      params['game1'] = this.i18nService
        .translate(`all.competition.team-assembly.${games1}`)
        .toLocaleLowerCase();
    }

    const games2 = params['game2'] as gameType;
    if (games2 != undefined) {
      params['game2'] = this.i18nService
        .translate(`all.competition.team-assembly.${games2}`)
        .toLocaleLowerCase();
    }
    warn.params = params;
  }

  private getLabels(data: AssemblyValidationData): string[] {
    const labels: string[] = [];
    for (let i = 0; i < 8; i++) {
      if (!data.subEvent?.eventType) {
        continue;
      }

      const gameLabels = gameLabel(data.subEvent?.eventType, i + 1);
      let labelMessage = '';

      for (const label of gameLabels) {
        if (Number.isInteger(label)) {
          labelMessage += label;
        } else {
          // omit type number of label
          type test = ReturnType<typeof gameLabel>;
          type labelType = Exclude<test[number], number | undefined>;

          labelMessage += this.i18nService.translate(label as labelType);
        }
      }
      labels.push(labelMessage);
    }

    return labels;
  }

  private _processPlayer(
    data: AssemblyValidationData,
    indexed: string[],
    based: string[],
    player?: Player,
  ):
    | undefined
    | (Partial<Player> & {
        base: boolean;
        team: boolean;
        exception: boolean;
        rankingLastPlace: RankingLastPlace | null;
        sum: number;
        highest: number;
      }) {
    if (!player?.id) {
      return;
    }

    const prepped = {
      ...player.toJSON(),
      base: false,
      team: false,
      exception: false,
      rankingLastPlace: null,
      sum: 0,
      highest: 0,
    } as Partial<Player> & {
      base: boolean;
      team: boolean;
      exception: boolean;
      rankingLastPlace: RankingLastPlace | null;
      sum: number;
      highest: number;
    };

    if (
      data.meta?.competition?.players?.map((p) => p.id).indexOf(player.id) !== -1 &&
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
        (player.rankingPlaces?.[0].single ?? 12) +
        (player.rankingPlaces?.[0].double ?? 12) +
        (data.type === 'MX' ? player.rankingPlaces?.[0].mix ?? 12 : 0);

      prepped.highest =
        Math.min(
          player.rankingPlaces?.[0].single ?? 12,
          player.rankingPlaces?.[0].double ?? 12,
          data.type === 'MX' ? player.rankingPlaces?.[0].mix ?? 12 : 12,
        ) ?? 12;
    } else {
      prepped.sum = data.type === 'MX' ? 36 : 24;
      prepped.highest = 12;
    }

    const best = Math.min(
      player.rankingLastPlaces?.[0]?.single ?? 12,
      player.rankingLastPlaces?.[0]?.double ?? 12,
      data.type === 'MX' ? player.rankingLastPlaces?.[0]?.mix ?? 12 : 12,
    );

    prepped.exception =
      data.meta?.competition?.players?.find((p) => p.id === player.id)?.levelException ?? false;

    // if a ranking is not availible use 2 higher then the best ranking but cannot be higher then 12
    // if the best ranking is higher then 12 use 12
    // if no ranking is availible use 12

    const single =
      player.rankingLastPlaces?.[0]?.single ?? (best < 12 ? (best == 11 ? 12 : best + 2) : 12);
    const double =
      player.rankingLastPlaces?.[0]?.double ?? (best < 12 ? (best == 11 ? 12 : best + 2) : 12);
    const mix =
      player.rankingLastPlaces?.[0]?.mix ?? (best < 12 ? (best == 11 ? 12 : best + 2) : 12);

    prepped.rankingLastPlace = {
      single,
      double,
      mix,
    } as RankingLastPlace;

    return prepped;
  }
}
