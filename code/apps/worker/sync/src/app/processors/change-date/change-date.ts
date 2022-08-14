import { EncounterCompetition } from '@badman/backend/database';
import { Sync, SyncQueue } from '@badman/backend/queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Job } from 'bull';
import { XMLParser } from 'fast-xml-parser';
import moment from 'moment-timezone';

@Processor({
  name: SyncQueue,
})
export class SyncDateProcessor {
  private readonly logger = new Logger(SyncDateProcessor.name);
  private visualFormat = 'YYYY-MM-DDTHH:mm:ss';

  constructor(private configService: ConfigService) {
    this.logger.debug('SyncDateConsumer');
  }

  @Process(Sync.ChangeDate)
  async acceptDate(job: Job<{ encounterId: string }>) {
    const encounter = await EncounterCompetition.findByPk(job.data.encounterId);

    if (!encounter) {
      this.logger.error(`Encounter ${job.data.encounterId} not found`);
      return;
    }

    try {
      this.logger.log(`Changing date for encounter ${job.data.encounterId}`);

      // Check if visual reality has same date stored
      const draw = await encounter.getDrawCompetition();
      const subEvent = await draw.getSubEventCompetition();
      const event = await subEvent.getEventCompetition();

      if (event.visualCode === null) {
        this.logger.error(`No visual code found for ${event?.name}`);
        return;
      }

      const url = `${this.configService.get('VR_API')}/Tournament/${
        event.visualCode
      }/Match/${encounter.visualCode}/Date`;

      const body = `
    <TournamentMatch>
        <TournamentID>${event.visualCode}</TournamentID>
        <MatchID>${encounter.visualCode}</MatchID>
        <MatchDate>${moment(encounter.date)
          .tz('Europe/Brussels')
          .format(this.visualFormat)}</MatchDate>
    </TournamentMatch>
  `;

      const options = {
        url,
        method: 'PUT',
        withCredentials: true,
        auth: {
          username: `${this.configService.get('VR_API_USER')}`,
          password: `${this.configService.get('VR_API_PASS')}`,
        },
        headers: { 'Content-Type': 'application/xml' },
        data: body,
      };

      if (this.configService.get('NODE_ENV') === 'production') {
        const resultPut = await axios(options);
        const parser = new XMLParser();

        const bodyPut = parser.parse(resultPut.data).Result as Result;
        if (bodyPut.Error?.Code !== 0 || bodyPut.Error.Message !== 'Success.') {
          this.logger.error(options);
          throw new Error(bodyPut.Error.Message);
        }
      } else {
        this.logger.debug(options);
      }
      encounter.synced = new Date();
    } catch (error) {
      this.logger.error(error);
      encounter.synced = null;
    } finally {
      await encounter.save();
    }
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
