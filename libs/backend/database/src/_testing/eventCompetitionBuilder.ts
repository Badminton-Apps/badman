import { UsedRankingTiming } from '@badman/utils';
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

  WithName(name: string): EventCompetitionBuilder {
    this.event.name = name;

    return this;
  }

  WithYear(year: number): EventCompetitionBuilder {
    this.event.season = year;

    return this;
  }

  WithOfficial(official: boolean): EventCompetitionBuilder {
    this.event.official = official;

    return this;
  }

  WithUsedRanking(usedRanking: UsedRankingTiming): EventCompetitionBuilder {
    this.event.usedRankingAmount = usedRanking.amount;
    this.event.usedRankingUnit = usedRanking.unit;

    return this;
  }

  WithSubEvent(subEvent: SubEventCompetitionBuilder): EventCompetitionBuilder {
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
        subEvent.WithEventId(this.event.id);
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
