import { EventCompetition, SubEventCompetition } from '../models';
import { DrawCompetitionBuilder } from './eventCompetitionDrawBuilder';
import { SystemGroupBuilder } from './systemGroupBuilder';

export class SubEventCompetitionBuilder {
  private build = false;

  private subEvent: SubEventCompetition;

  private draws: DrawCompetitionBuilder[] = [];

  constructor() {
    this.subEvent = new SubEventCompetition();
  }

  static Create(): SubEventCompetitionBuilder {
    return new SubEventCompetitionBuilder();
  }

  WithName(firstName: string): SubEventCompetitionBuilder {
    this.subEvent.name = firstName;

    return this;
  }

  WithId(id: string): SubEventCompetitionBuilder {
    this.subEvent.id = id;
    return this;
  }

  WithIndex(
    minBaseIndex: number,
    maxBaseIndex: number
  ): SubEventCompetitionBuilder {
    this.subEvent.minBaseIndex = minBaseIndex;
    this.subEvent.maxBaseIndex = maxBaseIndex;
    return this;
  }

  WitnMaxLevel(maxLevel: number): SubEventCompetitionBuilder {
    this.subEvent.maxLevel = maxLevel;
    return this;
  }

  ForEvent(event: EventCompetition): SubEventCompetitionBuilder {
    this.subEvent.eventId = event.id;
    return this;
  }

  WithGroup(group: SystemGroupBuilder) {
    group.WithCompetition(this.subEvent);
    return this;
  }

  WithDraw(draw: DrawCompetitionBuilder): SubEventCompetitionBuilder {
    draw.ForSubEvent(this.subEvent);
    this.draws.push(draw);
    return this;
  }

  async Build(rebuild = false): Promise<SubEventCompetition> {
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
