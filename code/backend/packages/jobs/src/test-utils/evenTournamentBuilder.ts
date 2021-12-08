import { EventTournament } from '@badvlasim/shared';
import { SubEventTournamentBuilder } from './evenTournamentSubEventBuilder';

export class EventTournamentBuilder {
  private event: EventTournament;

  private subEvents: SubEventTournamentBuilder[] = [];

  constructor(id?: string) {
    this.event = new EventTournament({
      id
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
    subEvent.ForEvent(this.event);
    this.subEvents.push(subEvent);
    return this;
  }

  async Build(): Promise<EventTournament> {
    try {
      await this.event.save();

      for (const subEvent of this.subEvents) {
        await subEvent.Build();
      }
    } catch (error) {
      console.log(error);
      throw error;
    }

    return this.event;
  }
}
