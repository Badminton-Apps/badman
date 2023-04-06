import { CompileService } from '@badman/backend-compile';
import { Player, RankingLastPlace, Team } from '@badman/backend-database';
import { gameLabel, I18nTranslations } from '@badman/utils';
import {
  Controller,
  Logger,
  Post,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { readFile } from 'fs/promises';
import moment from 'moment-timezone';
import { I18nService } from 'nestjs-i18n';
import { lastValueFrom, take } from 'rxjs';
import { AssemblyData, ValidationError } from '../models';
import { AssemblyService } from '../services';

type gameType =
  | 'single1'
  | 'single2'
  | 'single3'
  | 'single4'
  | 'double1'
  | 'double2'
  | 'double3'
  | 'double4';

@Controller({
  path: 'pdf',
})
export class AssemblyController {
  private readonly logger = new Logger(AssemblyController.name);

  constructor(
    private readonly compileService: CompileService,
    private readonly assemblyService: AssemblyService,
    private readonly i18nService: I18nService<I18nTranslations>
  ) {}

  @Post('team-assembly')
  async teamAssembly(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    // compile the template that returns a buffer of the pdf
    const pdf$ = await this.getTeamAssemblyPdf(req.body);

    // get the buffer from the observable
    const pdf = await lastValueFrom(pdf$);

    // set the content type to pdf
    res.setHeader('Content-Type', 'application/pdf');

    // return the pdf as a streamable file
    return new StreamableFile(pdf);
  }

  private async getTeamAssemblyPdf(input: {
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

    const validation = await this.assemblyService.validate(
      data,
      AssemblyService.defaultValidators()
    );

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
    const logo = await readFile(
      `${__dirname}/compile/libs/assembly/images/logo.png`,
      {
        encoding: 'base64',
      }
    );

    const date = moment(data.encounter.date)
      .tz('Europe/Brussels')
      .format('DD-MM-YYYY HH:mm');

    this.logger.debug(
      `Generating assembly for ${homeTeam.name} vs ${awayTeam.name} on ${date}`
    );

    const indexed = [];
    const based = [];

    const errors = validation.errors.map((error) => {
      this.translateGame(error);
      const translated = this.i18nService.translate(error.message, {
        debug: true,
        args: error.params,
      });
      return translated;
    });

    const warnings = validation.warnings.map((warn) => {
      this.translateGame(warn);

      const translated = this.i18nService.translate(warn.message, {
        debug: true,
        args: warn.params,
      });
      return translated;
    });

    const context = {
      date,
      baseIndex: data.meta.competition.teamIndex,
      teamIndex: data.teamIndex,
      homeTeam: homeTeam.name,
      awayTeam: awayTeam.name,
      captain: captain?.fullName,
      gameLabels: this.getLabels(data),
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
      validation: {
        ...validation,
        errors,
        warnings,
      },
      logo: `data:image/png;base64, ${logo}`,
    };

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

  private translateGame(warn: ValidationError) {
    const games = warn?.params?.['game'] as gameType;
    if (games != undefined) {
      warn.params['game'] = this.i18nService
        .translate(`all.competition.team-assembly.${games}`)
        .toLocaleLowerCase();
    }

    const games1 = warn?.params?.['game1'] as gameType;
    if (games1 != undefined) {
      warn.params['game1'] = this.i18nService
        .translate(`all.competition.team-assembly.${games1}`)
        .toLocaleLowerCase();
    }

    const games2 = warn?.params?.['game2'] as gameType;
    if (games2 != undefined) {
      warn.params['game2'] = this.i18nService
        .translate(`all.competition.team-assembly.${games2}`)
        .toLocaleLowerCase();
    }
  }

  private getLabels(data: AssemblyData): string[] {
    const labels: string[] = [];
    for (let i = 0; i < 8; i++) {
      const gameLabels = gameLabel(
        data.subEvent?.eventType as 'M' | 'F' | 'MX',
        i + 1
      );
      let labelMessage = '';

      for (const label of gameLabels) {
        if (Number.isInteger(label)) {
          labelMessage += label;
        } else {
          // omit type number of label
          type test = ReturnType<typeof gameLabel>;
          type labelType = Exclude<test[number], number>;

          labelMessage += this.i18nService.translate(label as labelType);
        }
      }
      labels.push(labelMessage);
    }

    return labels;
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
      data.meta.competition.players?.map((p) => p.id).indexOf(player.id) !== -1 &&
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
    } else {
      prepped.sum = data.type === 'MX' ? 36 : 24;
      prepped.highest = 12;
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
      (best < 12 ? (best == 11 ? 12 : best + 2) : 12);
    const double =
      player.rankingLastPlaces?.[0]?.double ??
      (best < 12 ? (best == 11 ? 12 : best + 2) : 12);
    const mix =
      player.rankingLastPlaces?.[0]?.mix ??
      (best < 12 ? (best == 11 ? 12 : best + 2) : 12);

    prepped.rankingLastPlace = {
      single,
      double,
      mix,
    };

    return prepped;
  }
}
