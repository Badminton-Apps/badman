import { EventCompetition, EventEntry } from '@badman/backend/database';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ResyncBaseTeamsService {
  private readonly logger = new Logger(ResyncBaseTeamsService.name);

  async resyncBaseTeams() {
    this.logger.debug('resyncBaseTeams');

    const events = await EventCompetition.findAll({
      where: {
        startYear: 2022,
      },
    });

    for (const event of events) {
      const subEvents = await event.getSubEventCompetitions();
      for (const subEvent of subEvents) {
        const entries = await subEvent.getEventEntries();

        if (entries.length === 0) {
          this.logger.debug('No entry found for', subEvent.name);
          continue;
        }

        for (const entry of entries) {
          entry.changed('meta', true);
          await entry.save();
        }
      }
    }
  }
}
