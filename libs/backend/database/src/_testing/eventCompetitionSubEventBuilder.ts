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

  constructor(type: SubEventTypeEnum, name?: string, eventId?: string) {
    this.subEvent = new SubEventCompetition({
      eventType: type,
      name: name ?? 'SubEvent',
      eventId: eventId ?? '123',
      levelWithModifier: 1,
    });
  }

  static Create(type: SubEventTypeEnum, name?: string, eventId?: string) {
    return new SubEventCompetitionBuilder(type, name, eventId);
  }

  WithId(id: string): this {
    this.subEvent.id = id;
    return this;
  }

  WithEventId(eventId: string): this {
    this.subEvent.eventId = eventId;
    return this;
  }

  WithIndex(minBaseIndex: number, maxBaseIndex: number): this {
    this.subEvent.minBaseIndex = minBaseIndex;
    this.subEvent.maxBaseIndex = maxBaseIndex;
    return this;
  }

  WitnMaxLevel(maxLevel: number): this {
    this.subEvent.maxLevel = maxLevel;
    return this;
  }

  ForEvent(event: EventCompetitionBuilder): this {
    event.WithSubEvent(this);
    return this;
  }

  WithGroup(group: SystemGroupBuilder) {
    group.WithCompetition(this.subEvent);
    return this;
  }

  WithDraw(draw: DrawCompetitionBuilder): this {
    this.draws.push(draw);
    return this;
  }

  WithEntry(entry: EventCompetitionEntryBuilder): this {
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
