import { EventTournament } from '../models';
import { SubEventTournamentBuilder } from './eventTournamentSubEventBuilder';

export class EventTournamentBuilder {
  private build = false;

  private event: EventTournament;

  private subEvents: SubEventTournamentBuilder[] = [];

  constructor(id?: string) {
    this.event = new EventTournament({
      id,
    });
  }

  static Create(id?: string): EventTournamentBuilder {
    return new EventTournamentBuilder(id);
  }

  WithName(firstName: string): EventTournamentBuilder {
    this.event.name = firstName;

    return this;
  }

  WithSubEvent(subEvent: SubEventTournamentBuilder): EventTournamentBuilder {
    this.subEvents.push(subEvent);
    return this;
  }

  async Build(rebuild = false): Promise<EventTournament> {
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
