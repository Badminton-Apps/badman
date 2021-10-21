import { Cron, DataBaseHandler, logger, XmlResult, XmlTournamentTypeID } from '@badvlasim/shared';
import { parse } from 'fast-xml-parser';
import axios from 'axios';
import moment, { Moment } from 'moment';
import { CronJob } from '../cronJob';
import { CompetitionSyncer } from './visualSyncer/competition-sync';
import { TournamentSyncer } from './visualSyncer/tournament-sync';

export class GetScoresVisual extends CronJob {
  private _pageSize = 1000;
  private _competitionSync: CompetitionSyncer;
  private _tournamentSync: TournamentSyncer;
  private _meta: any;

  constructor(cron: Cron) {
    super(cron);
    this._meta = JSON.parse(cron.meta) as any;

    this._competitionSync = new CompetitionSyncer();
    this._tournamentSync = new TournamentSyncer();
  }

  async run(args?: { date: Date }): Promise<void> {
    // Use argument date, else stored date, finally use today
    const newDate = moment(args?.date ?? this.dbCron.lastRun ?? null);
    logger.info(`Started sync of Visual scores from ${newDate.format('YYYY-MM-DD')}`);

    let newEvents = await this._getChangeEvents(newDate);

    newEvents = newEvents.sort((a, b) => {
      return moment(b.StartDate).valueOf() - moment(a.StartDate).valueOf();
    }); 

    // newEvents = newEvents.filter(event => {
    //   return (
    //     event.Name == 'VVBBC interclubcompetitie 2021-2022' ||
    //     event.Name == 'Limburgse interclubcompetitie 2021-2022' ||
    //     event.Name == 'WVBF Competitie 2021-2022'
    //   );
    // });

    for (const xmlTournament of newEvents) {
      const transaction = await DataBaseHandler.sequelizeInstance.transaction();
      try {
        logger.info(`Processing ${xmlTournament.Name}`);

        if (
          xmlTournament.TypeID === XmlTournamentTypeID.OnlineLeague ||
          xmlTournament.TypeID === XmlTournamentTypeID.TeamTournament
        ) {
          await this._competitionSync.process({ transaction, xmlTournament });
        } else {
          // await this._tournamentSync.process({ transaction, xmlTournament });
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

  private async _getChangeEvents(date: Moment, page: number = 0) {
    const url = `${process.env.VR_API}/Tournament?list=1&refdate=${date.format(
      'YYYY-MM-DD'
    )}&pagesize=${this._pageSize}&pageno=${page}`;
    const result = await axios.get(url, {
      withCredentials: true,
      auth: {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`
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

  static dbEntry(): {
    cron: string;
    type: string;
  } {
    return {
      cron: '0 2 * * *',
      type: 'sync-visual'
    };
  }
}
