import { EncounterCompetition } from '@badman/api/database';
import { Sync, SyncQueue } from '@badman/queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { Job } from 'bull';
import { XMLParser } from 'fast-xml-parser';
import moment from 'moment';

@Processor({
  name: SyncQueue,
})
export class SyncDateProcessor {
  private readonly logger = new Logger(SyncDateProcessor.name);
  private visualFormat = 'YYYY-MM-DDTHH:mm:ss';

  constructor() {
    this.logger.debug('SyncDateConsumer');
  }

  @Process(Sync.ChangeDate)
  async acceptDate(job: Job<{ encounterId: string }>) {
    this.logger.log(`Changing date for encounter ${job.data.encounterId}`);

    const encounter = await EncounterCompetition.findByPk(job.data.encounterId);
    // Check if visual reality has same date stored
    const draw = await encounter.getDrawCompetition();
    const subEvent = await draw.getSubEventCompetition();
    const event = await subEvent.getEventCompetition();

    if (event.visualCode === null) {
      this.logger.error(`No visual code found for ${event?.name}`);
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      const resultPut = await axios.put(
        `${process.env.VR_API}/Tournament/${event.visualCode}/Match/${encounter.visualCode}/Date`,
        {
          withCredentials: true,
          auth: {
            username: `${process.env.VR_API_USER}`,
            password: `${process.env.VR_API_PASS}`,
          },
          headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/xml',
          },
          body: `
            <TournamentMatch>
                <TournamentID>${event.visualCode}</TournamentID>
                <MatchID>${encounter.visualCode}</MatchID>
                <MatchDate>${moment(encounter.date).format(
                  this.visualFormat
                )}</MatchDate>
            </TournamentMatch>
          `,
        }
      );
      const parser = new XMLParser();

      const bodyPut = parser.parse(resultPut.data).Result as Result;
      if (bodyPut.Error?.Code !== 0 || bodyPut.Error.Message !== 'Success.') {
        this.logger.error(
          `${process.env.VR_API}/Tournament/${event.visualCode}/Match/${encounter.visualCode}/Date`,
          `<TournamentMatch>
            <TournamentID>${event.visualCode}</TournamentID>
            <MatchID>${encounter.visualCode}</MatchID>
            <MatchDate>${moment(encounter.date).format(
              this.visualFormat
            )}</MatchDate>
        </TournamentMatch>`
        );

        throw new Error(bodyPut.Error.Message);
      }
    } else {
      this.logger.debug(
        'Putting the following',
        `<TournamentMatch>
            <TournamentID>${event.visualCode}</TournamentID>
            <MatchID>${encounter.visualCode}</MatchID>
            <MatchDate>${moment(encounter.date).format(
              this.visualFormat
            )}</MatchDate>
        </TournamentMatch>`,
        `${process.env.VR_API}/Tournament/${event.visualCode}/Match/${encounter.visualCode}/Date`
      );
    }

    encounter.synced = new Date();
  }
}

/* eslint-disable @typescript-eslint/naming-convention */
interface Result {
  TournamentMatch?: TournamentMatch;
  Error?: XmlError;
  _Version: string;
}

interface TournamentMatch {
  TournamentID: string;
  MatchID: string;
  MatchDate: Date;
}

interface XmlError {
  Code: number;
  Message: string;
}
/* eslint-enable @typescript-eslint/naming-convention */
