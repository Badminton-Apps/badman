import { EventCompetition } from '@badman/api/database';
import moment, { Moment } from 'moment';
import { StepProcessor, StepOptions } from '../../../../processing';
import { VisualService } from '../../../../services';
import { XmlTournament } from '../../../../utils';

export interface EventStepData {
  stop: boolean;
  existed: boolean;
  event: EventCompetition;
  internalId: number;
}

export class CompetitionSyncEventProcessor extends StepProcessor {
  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions
  ) {
    super(options);
  }

  public async process(): Promise<EventStepData> {
    this.logger.debug(`Searching for ${this.visualTournament.Name}`);
    let event = await EventCompetition.findOne({
      where: { name: `${this.visualTournament.Name}` },
      transaction: this.transaction,
    });
    let existed = true;

    if (!event) {
      existed = false;
      const dates: Moment[] = [];
      for (
        let date = moment(this.visualTournament.StartDate);
        date.diff(this.visualTournament.EndDate, 'days') <= 0;
        date.add(1, 'days')
      ) {
        dates.push(date.clone());
      }

      const visualTournament = await this.visualService.getTournament(
        this.visualTournament.Code
      );

      this.logger.debug(
        `EventCompetition ${visualTournament.Name} not found, creating`
      );
      event = await new EventCompetition({
        name: visualTournament.Name,
        visualCode: visualTournament.Code,
        startYear: moment(visualTournament.StartDate).year(),
      }).save({ transaction: this.transaction });
    } else {
      // Later we will change the search function to use the tournament code
      if (
        event.visualCode === null ||
        event.visualCode !== this.visualTournament.Code
      ) {
        event.visualCode = this.visualTournament.Code;
        await event.save({ transaction: this.transaction });
      }
    }

    if (event.allowEnlisting) {
      this.logger.debug(
        `EventCompetition ${event.name} is open, skipping processing`
      );
    }

    return {
      stop: event.allowEnlisting,
      existed,
      event,
      internalId: parseInt(this.visualTournament.Code, 10),
    };
  }
}
