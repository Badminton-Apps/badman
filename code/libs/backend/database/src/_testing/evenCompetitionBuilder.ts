import { EventCompetition } from '../models';
import { SubEventCompetitionBuilder } from './evenCompetitionSubEventBuilder';

export class EventCompetitionBuilder {
  private event: EventCompetition;

  private subEvents: SubEventCompetitionBuilder[] = [];

  constructor(id?: string) {
    this.event = new EventCompetition({
      id,
    });
  }

  static Create(id?: string): EventCompetitionBuilder {
    return new EventCompetitionBuilder(id);
  }

  WithName(firstName: string): EventCompetitionBuilder {
    this.event.name = firstName;

    return this;
  }

  WithSubEvent(subEvent: SubEventCompetitionBuilder): EventCompetitionBuilder {
    subEvent.ForEvent(this.event);
    this.subEvents.push(subEvent);
    return this;
  }

  async Build(): Promise<EventCompetition> {
    try {
      await this.event.save();

      for (const subEvent of this.subEvents) {
        await subEvent.Build();
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    return this.event;
  }
}
