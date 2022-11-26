import { EventCompetition } from '../models';
import { SubEventCompetitionBuilder } from './eventCompetitionSubEventBuilder';

export class EventCompetitionBuilder {
  private build = false;

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

  async Build(rebuild = false): Promise<EventCompetition> {
    if (this.build && !rebuild) {
      return this.event;
    }

    try {
      await this.event.save();

      for (const subEvent of this.subEvents) {
        await subEvent.Build();
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.event;
  }
}