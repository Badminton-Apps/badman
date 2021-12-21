import { EventTournament, logger, StepProcessor, XmlTournament } from '@badvlasim/shared';
import moment, { Moment } from 'moment';
import { Transaction } from 'sequelize';
import { VisualService } from '../../../visualService';

export interface EventStepData {
  existed: boolean;
  event: EventTournament;
  internalId: number;
}

export class TournamentSyncEventProcessor extends StepProcessor {
  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly transaction: Transaction,
    protected readonly visualService: VisualService
  ) {
    super(visualTournament, transaction);
  }

  public async process(): Promise<EventStepData> {
    logger.debug(`Searching for ${this.visualTournament.Name}`);
    let event = await EventTournament.findOne({
      where: { name: `${this.visualTournament.Name}` },
      transaction: this.transaction
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

      const visualTournament = await this.visualService.getTournament(this.visualTournament.Code);

      logger.debug(`EventTournament ${visualTournament.Name} not found, creating`);
      event = await new EventTournament({
        name: visualTournament.Name,
        firstDay: visualTournament.StartDate,
        visualCode: visualTournament.Code,
        dates: dates.map((r) => r.toISOString()).join(','),
        tournamentNumber: visualTournament.Number
      }).save({ transaction: this.transaction });
    } else {
      // Later we will change the search function to use the tournament code
      if (event.visualCode === null) {
        event.visualCode = this.visualTournament.Code;
        await event.save({ transaction: this.transaction });
      }
    }

    return {
      // stop: existed,
      existed,
      event,
      internalId: parseInt(this.visualTournament.Code, 10)
    };
  }
}
