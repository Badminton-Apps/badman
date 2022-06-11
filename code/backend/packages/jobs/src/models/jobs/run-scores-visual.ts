import {
  Cron,
  DataBaseHandler,
  EVENTS,
  logger,
  SocketEmitter,
  XmlResult,
  XmlTournamentTypeID
} from '@badvlasim/shared';
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

  private logger = logger.child({ label: 'GetScoresVisual' });

  private _pageSize = 1000;
  private _competitionSync: CompetitionSyncer;
  private _tournamentSync: TournamentSyncer;

  constructor(
    cron: Cron,
    readonly options?: {
      newGames?: boolean;
    }
  ) {
    super(cron);
    this._competitionSync = new CompetitionSyncer(options);
    this._tournamentSync = new TournamentSyncer(options);
  }

  /**
   * Run the visual sync
   * @param args.date Start from a certain date
   * @param args.skip Skip certain event types
   * @param args.only Only process certain event types
   * @param args.offset Continue from a previous (failed) run
   * @param args.limit Only process a certain number of events
   * 
   * 
   * Example args:
   ```json
   {
      "date": "2000-01-01",
      "offset": 816
    }
    ```
    --------------------------------------------------------------------------------
    ```json
    {
      "date": "2000-01-01",
      "only": [
        "Georges Rogiers Tornooi - YBJM Brons"
      ]
    }
    ```
   */

  async run(args?: {
    // Changed after date
    date?: Date;
    // Start from certain date
    startDate?: Date;
    // Skip types / event names
    skip: string[];
    // Only types / event names
    only: string[];
    // Continue from a previous (failed) run
    offset: number;
    // Only process a certain number of events
    limit: number;
  }): Promise<void> {
    this.dbCron = await Cron.findByPk(this.dbCron.id);
    // Use argument date, else stored date, finally use today
    const newDate = moment(args?.date ?? this.dbCron.lastRun ?? null);
    this.logger.info(`Started sync of Visual scores from ${newDate.format('YYYY-MM-DD')}`);

    let newEvents = await this._getChangeEvents(newDate);

    newEvents = newEvents.sort((a, b) => {
      return moment(a.StartDate).valueOf() - moment(b.StartDate).valueOf();
    });

    if (args?.startDate) {
      newEvents = newEvents.filter((e) => {
        return moment(e.StartDate).isSameOrAfter(args?.startDate);
      });
    }

    this.dbCron.meta = {
      percent: 0,
      current: 0,
      total: newEvents.length
    };
    await this.dbCron.save();

    let toProcess = newEvents.length;
    if (args?.limit) {
      toProcess = args?.offset ?? 0 + args?.limit;
    }

    for (let i = args?.offset ?? 0; i < toProcess; i++) {
      const xmlTournament = newEvents[i];
      const current = i + 1;
      const total = toProcess;
      const percent = Math.round((current / total) * 10000) / 100;
      this.logger.info(`Processing ${xmlTournament.Name}, ${percent}% (${i}/${total})`);
      const transaction = await DataBaseHandler.sequelizeInstance.transaction();
      this.dbCron.meta = {
        percent,
        current,
        total
      };
      await this.dbCron.save({ transaction });
      SocketEmitter.emit(EVENTS.JOB.CRON_UPDATE, this.dbCron.toJSON());
      try {
        // Skip certain events
        if ((args?.skip?.length ?? 0) > 0 && args?.skip?.includes(xmlTournament.Name)) {
          await transaction.commit();
          continue;
        }

        // Only process certain events
        if ((args?.only?.length ?? 0) > 0 && !args?.only?.includes(xmlTournament.Name)) {
          await transaction.commit();
          continue;
        }

        if (
          xmlTournament.TypeID === XmlTournamentTypeID.OnlineLeague ||
          xmlTournament.TypeID === XmlTournamentTypeID.TeamTournament
        ) {
          if (args?.skip?.includes('competition')) {
            await transaction.commit();
            continue;
          }

          await this._competitionSync.process({
            transaction,
            xmlTournament,
            options: { ...args, lastRun: this.dbCron.lastRun }
          });
        } else {
          if (args?.skip?.includes('tournament')) {
            await transaction.commit();
            continue;
          }

          await this._tournamentSync.process({
            transaction,
            xmlTournament,
            options: { ...args, lastRun: this.dbCron.lastRun }
          });
        }
        await transaction.commit();
        this.logger.info(`Finished ${xmlTournament.Name}`);
      } catch (e) {
        this.logger.error('Rollback', e);
        await transaction.rollback();
        throw e;
      }
    }

    this.logger.info('Finished sync of Visual scores');
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
          this.logger.warn(`Retry attempt #${cfg.currentRetryAttempt}`);
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

    if (body.Tournament === undefined) {
      return [];
    }

    const tournaments = Array.isArray(body.Tournament) ? [...body.Tournament] : [body.Tournament];

    // TODO: Wait untill Visual fixes this
    // if (tournaments.length != 0) {
    //   tournaments.concat(await this._getChangeEvents(date, page + 1));
    // }

    // Temp fix for competition
    return tournaments.filter((t) => !t.Name.toLowerCase().includes('2022-2023'));
  }
}
