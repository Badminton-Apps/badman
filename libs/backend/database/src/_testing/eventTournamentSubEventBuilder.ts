import { SubEventTournament } from '../models';
import { EventTournamentBuilder } from './eventTournamentBuilder';
import { DrawTournamentBuilder } from './eventTournamentDrawBuilder';
import { SystemGroupBuilder } from './systemGroupBuilder';

export class SubEventTournamentBuilder {
  private build = false;

  private subEvent: SubEventTournament;

  private draws: DrawTournamentBuilder[] = [];

  constructor() {
    this.subEvent = new SubEventTournament();
  }

  static Create(): SubEventTournamentBuilder {
    return new SubEventTournamentBuilder();
  }

  WithName(firstName: string): SubEventTournamentBuilder {
    this.subEvent.name = firstName;

    return this;
  }

  WithId(id: string): SubEventTournamentBuilder {
    this.subEvent.id = id;
    return this;
  }

  ForEvent(event: EventTournamentBuilder): SubEventTournamentBuilder {
    event.WithSubEvent(this);
    return this;
  }

  WithGroup(group: SystemGroupBuilder) {
    group.WithTournament(this.subEvent);
    return this;
  }

  WithDraw(draw: DrawTournamentBuilder): SubEventTournamentBuilder {
    this.draws.push(draw);
    return this;
  }

  async Build(rebuild = false): Promise<SubEventTournament> {
    if (this.build && !rebuild) {
      return this.subEvent;
    }

    try {
      await this.subEvent.save();

      for (const draw of this.draws) {
        await draw.Build();
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.subEvent;
  }
}
