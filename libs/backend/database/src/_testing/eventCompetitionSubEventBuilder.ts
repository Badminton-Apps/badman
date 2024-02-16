import { SubEventTypeEnum } from '@badman/utils';
import { SubEventCompetition } from '../models';
import { EventCompetitionBuilder } from './eventCompetitionBuilder';
import { DrawCompetitionBuilder } from './eventCompetitionDrawBuilder';
import { SystemGroupBuilder } from './systemGroupBuilder';
import { EventCompetitionEntryBuilder } from './eventCompetitionEntryBuilder';

export class SubEventCompetitionBuilder {
  private build = false;

  private subEvent: SubEventCompetition;

  private draws: DrawCompetitionBuilder[] = [];
  private entries: EventCompetitionEntryBuilder[] = [];

  constructor(type: SubEventTypeEnum) {
    this.subEvent = new SubEventCompetition({
      eventType: type,
    });
  }

  static Create(type: SubEventTypeEnum): SubEventCompetitionBuilder {
    return new SubEventCompetitionBuilder(type);
  }

  WithName(firstName: string): SubEventCompetitionBuilder {
    this.subEvent.name = firstName;

    return this;
  }

  WithId(id: string): SubEventCompetitionBuilder {
    this.subEvent.id = id;
    return this;
  }

  WithIndex(minBaseIndex: number, maxBaseIndex: number): SubEventCompetitionBuilder {
    this.subEvent.minBaseIndex = minBaseIndex;
    this.subEvent.maxBaseIndex = maxBaseIndex;
    return this;
  }

  WitnMaxLevel(maxLevel: number): SubEventCompetitionBuilder {
    this.subEvent.maxLevel = maxLevel;
    return this;
  }

  WithEventId(eventId: string): SubEventCompetitionBuilder {
    this.subEvent.eventId = eventId;
    return this;
  }

  ForEvent(event: EventCompetitionBuilder): SubEventCompetitionBuilder {
    event.WithSubEvent(this);
    return this;
  }

  WithGroup(group: SystemGroupBuilder) {
    group.WithCompetition(this.subEvent);
    return this;
  }

  WithDraw(draw: DrawCompetitionBuilder): SubEventCompetitionBuilder {
    this.draws.push(draw);
    return this;
  }

  WithEntry(entry: EventCompetitionEntryBuilder): SubEventCompetitionBuilder {
    this.entries.push(entry);
    return this;
  }

  async Build(rebuild = false): Promise<SubEventCompetition> {
    if (this.build && !rebuild) {
      return this.subEvent;
    }

    try {
      await this.subEvent.save();

      for (const draw of this.draws) {
        const d = await draw.Build();
        await this.subEvent.addDrawCompetition(d);
      }

      for (const entry of this.entries) {
        entry.WithSubEventId(this.subEvent.id);
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.subEvent;
  }
}
