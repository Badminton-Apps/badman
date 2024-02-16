import { EventCompetition } from '@badman/backend-database';
import moment, { Moment } from 'moment';
import { StepProcessor, StepOptions } from '../../../../processing';
import { VisualService, XmlTournament } from '@badman/backend-visual';
import { Logger } from '@nestjs/common';
import { Op } from 'sequelize';

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
    options?: StepOptions,
  ) {
    if (!options) {
      options = {};
    }
    options.logger = options.logger || new Logger(CompetitionSyncEventProcessor.name);
    super(options);
  }

  public async process(): Promise<EventStepData> {
    this.logger.debug(`Searching for ${this.visualTournament.Name}`);
    let event = await EventCompetition.findOne({
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

      const visualTournament = await this.visualService.getTournament(this.visualTournament.Code);

      this.logger.debug(`EventCompetition ${visualTournament.Name} not found, creating`);
      event = new EventCompetition({
        name: visualTournament.Name,
        visualCode: visualTournament.Code,
        season: moment(visualTournament.StartDate).year(),
      });
    } else {
      // Later we will change the search function to use the tournament code
      if (event.visualCode === null || event.visualCode !== this.visualTournament.Code) {
        event.visualCode = this.visualTournament.Code;
      }
    }

    event.lastSync = new Date();
    await event.save({ transaction: this.transaction });

    const enlistingOpen =
      moment(event.openDate).diff(moment(), 'days') > 0 &&
      moment(event.closeDate).diff(moment(), 'days') < 0;

    if (enlistingOpen) {
      this.logger.debug(`EventCompetition ${event.name} is open, skipping processing`);
    }

    return {
      stop: enlistingOpen,
      existed,
      event,
      internalId: parseInt(this.visualTournament.Code, 10),
    };
  }
}
