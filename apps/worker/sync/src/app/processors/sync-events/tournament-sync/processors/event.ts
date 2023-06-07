import { EventTournament } from '@badman/backend-database';
import moment, { Moment } from 'moment';
import { StepProcessor, StepOptions } from '../../../../processing';
import { VisualService, XmlTournament } from '@badman/backend-visual';
import { Logger } from '@nestjs/common';
import { Op } from 'sequelize';

export interface EventStepData {
  existed: boolean;
  event: EventTournament;
  internalId: number;
}

export class TournamentSyncEventProcessor extends StepProcessor {
  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions
  ) {
    options.logger =
      options.logger || new Logger(TournamentSyncEventProcessor.name);
    super(options);
  }

  public async process(): Promise<EventStepData> {
    this.logger.debug(`Searching for ${this.visualTournament.Name}`);
    let event = await EventTournament.findOne({
      where: {
        [Op.or]: [
          { name: `${this.visualTournament.Name}` },
          { visualCode: `${this.visualTournament.Code}` },
        ],
      },
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
        `EventTournament ${visualTournament.Name} not found, creating`
      );
      event = new EventTournament({
        name: visualTournament.Name,
        firstDay: visualTournament.StartDate,
        visualCode: visualTournament.Code,
        dates: dates.map((r) => r.toISOString()).join(','),
        tournamentNumber: visualTournament.Number,
      });
    } else {
      // Later we will change the search function to use the tournament code
      if (
        event.visualCode === null ||
        event.visualCode !== this.visualTournament.Code
      ) {
        event.visualCode = this.visualTournament.Code;
      }
    }

    event.lastSync = new Date();
    await event.save({ transaction: this.transaction });

    return {
      // stop: existed,
      existed,
      event,
      internalId: parseInt(this.visualTournament.Code, 10),
    };
  }
}
