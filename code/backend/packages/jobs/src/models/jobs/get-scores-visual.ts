import { Cron, DataBaseHandler, logger, XmlResult, XmlTournamentTypeID } from '@badvlasim/shared';
import { parse } from 'fast-xml-parser';
import got from 'got';
import moment, { Moment } from 'moment';
import { CronJob } from '../cronJob';
import { CompetitionSyncer } from './visualSyncer/competition-sync';
import { TournamentSyncer } from './visualSyncer/tournament-sync';

export class GetScoresVisual extends CronJob {
  private _pageSize = 100;
  private _competitionSync: CompetitionSyncer;
  private _tournamentSync: TournamentSyncer;
  private _meta: any;

  constructor(cron: Cron) {
    super(cron);
    this._meta = JSON.parse(cron.meta) as any;

    this._competitionSync = new CompetitionSyncer();
    this._tournamentSync = new TournamentSyncer();
  }

  async run(): Promise<void> {
    const newDate = moment('2020-08-13');
    const newEvents = await this._getChangeEvents(newDate);

    for (const xmlTournament of newEvents) {
      const transaction = await DataBaseHandler.sequelizeInstance.transaction();
      try {
        logger.debug(`Processing ${xmlTournament.Name}`);
        if (
          xmlTournament.TypeID === XmlTournamentTypeID.OnlineLeague ||
          xmlTournament.TypeID === XmlTournamentTypeID.TeamTournament
        ) {
          await this._competitionSync.process({ transaction, xmlTournament });
        } else {
          await this._tournamentSync.process({ transaction, xmlTournament });
        }
        await transaction.commit();
      } catch (e) {
        logger.error('Rollback', e);
        await transaction.rollback();
      }
    }
    logger.debug(`${newEvents.length} tournaments changed`);
  }

  private async _getChangeEvents(date: Moment, page: number = 0) {
    const url = `${process.env.VR_API}?list=1&refdate=${date.format('YYYY-MM-DD')}&pagesize=${
      this._pageSize
    }&page=${page}`;
    const result = await got.get(url, {
      username: `${process.env.VR_API_USER}`,
      password: `${process.env.VR_API_PASS}`,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/xml'
      }
    });

    if (result.statusCode !== 200) {
      throw new Error(`Cannot get changed tournaments: ${result.statusCode}`);
    }

    const body = parse(result.body, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: true
    }).Result as XmlResult;
    const tournaments = Array.isArray(body.Tournament) ? [...body.Tournament] : [body.Tournament];

    if (tournaments.length === this._pageSize) {
      tournaments.concat(await this._getChangeEvents(date, page + 1));
    }

    return tournaments;
  }

  static dbEntry(): {
    cron: string;
    type: string;
  } {
    return {
      cron: '0 23 * * *',
      type: 'sync-visual'
    };
  }
}
