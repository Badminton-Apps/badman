import { Cron, DataBaseHandler, logger, XmlResult, XmlTournamentTypeID } from '@badvlasim/shared';
import axios from 'axios';
import { parse } from 'fast-xml-parser';
import moment, { Moment } from 'moment';
import * as rax from 'retry-axios';
import { CronJob } from '../cronJob';
import { CompetitionSyncer, TournamentSyncer } from './get-scores-visual';

export class GetScoresVisual extends CronJob {
  /**
   * Run every day except monday
   */
  static dbEntryDaily(): {
    cron: string;
    type: string;
  } {
    return {
      cron: '0 2 * * 0,2-6',
      type: 'scores-visual'
    };
  }

  /**
   * Run every monday
   */
  static dbEntryWeekly(): {
    cron: string;
    type: string;
  } {
    return {
      cron: '0 0 * * MON',
      type: 'scores-visual-full'
    };
  }

  private _pageSize = 1000;
  private _competitionSync: CompetitionSyncer;
  private _tournamentSync: TournamentSyncer;

  constructor(
    cron: Cron,
    readonly options?: {
      updateMeta?: boolean;
    }
  ) {
    super(cron);
    this._competitionSync = new CompetitionSyncer(options);
    this._tournamentSync = new TournamentSyncer(options);
  }

  async run(args?: {
    date: Date;
    skip: string[];
    other: { [key: string]: object };
  }): Promise<void> {
    this.dbCron = await Cron.findByPk(this.dbCron.id);
    // Use argument date, else stored date, finally use today
    const newDate = moment(args?.date ?? this.dbCron.lastRun ?? null);
    logger.info(`Started sync of Visual scores from ${newDate.format('YYYY-MM-DD')}`);

    let newEvents = await this._getChangeEvents(newDate);

    newEvents = newEvents.sort((a, b) => {
      return moment(a.StartDate).valueOf() - moment(b.StartDate).valueOf();
    });

    this.dbCron.meta = {
      percent: 0,
      current: 0,
      total: newEvents.length
    };
    await this.dbCron.save();

    // newEvents = newEvents.filter((event) => {
    //   //return moment(event.StartDate).isAfter('2020-09-01 00:00:00+02');
    //   return event.Name === 'PBA competitie 2021-2022'
    //   // && event.Name != 'VVBBC interclubcompetitie 2021-2022'
    //   // && event.Name != 'PBO competitie 2021-2022'
    //   // || event.Name == 'Limburgse interclubcompetitie 2021-2022'
    //   // || event.Name == 'WVBF Competitie 2021-2022'
    // });

    for (let i = 0; i < newEvents.length; i++) {
      const xmlTournament = newEvents[i];
      const current = i + 1;
      const total = newEvents.length;
      const percent = Math.round((current / total) * 10000) / 100;
      logger.info(`Processing ${xmlTournament.Name}, ${percent}% (${i}/${newEvents.length})`);
      const transaction = await DataBaseHandler.sequelizeInstance.transaction();

      this.dbCron.meta = {
        percent,
        current,
        total
      };
      await this.dbCron.save({ transaction });
      try {
        if (
          xmlTournament.TypeID === XmlTournamentTypeID.OnlineLeague ||
          xmlTournament.TypeID === XmlTournamentTypeID.TeamTournament
        ) {
          if (!args?.skip?.includes(xmlTournament.Name) && !args?.skip?.includes('competition')) {
            await this._competitionSync.process({ transaction, xmlTournament, other: args?.other });
          }
        } else {
          if (!args?.skip?.includes(xmlTournament.Name) && !args?.skip?.includes('tournament')) {
            await this._tournamentSync.process({ transaction, xmlTournament, other: args?.other });
          }
        }
        await transaction.commit();
        logger.info(`Finished ${xmlTournament.Name}`);
      } catch (e) {
        logger.error('Rollback', e);
        await transaction.rollback();
        throw e;
      }
    }

    logger.info('Finished sync of Visual scores');
  }

  private async _getChangeEvents(date: Moment, page = 0) {
    const url = `${process.env.VR_API}/Tournament?list=1&refdate=${date.format(
      'YYYY-MM-DD'
    )}&pagesize=${this._pageSize}&pageno=${page}`;
    const result = await axios.get(url, {
      withCredentials: true,
      auth: {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`
      },
      raxConfig: {
        retry: 25,
        onRetryAttempt: (err) => {
          const cfg = rax.getConfig(err);
          logger.warn(`Retry attempt #${cfg.currentRetryAttempt}`);
        }
      },
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/xml'
      }
    });

    if (result.status !== 200) {
      throw new Error(`Cannot get changed tournaments: ${result.status}`);
    }

    const body = parse(result.data, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: true
    }).Result as XmlResult;
    const tournaments = Array.isArray(body.Tournament) ? [...body.Tournament] : [body.Tournament];

    // TODO: Wait untill Visual fixes this
    // if (tournaments.length != 0) {
    //   tournaments.concat(await this._getChangeEvents(date, page + 1));
    // }

    return tournaments;
  }
}
