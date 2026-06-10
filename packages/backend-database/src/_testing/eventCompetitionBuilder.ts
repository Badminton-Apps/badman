import { LevelType, UsedRankingTiming } from "@badman/utils";
import { EventCompetition } from "../models";
import { SubEventCompetitionBuilder } from "./eventCompetitionSubEventBuilder";

export class EventCompetitionBuilder {
  private build = false;

  private event: EventCompetition;

  private subEvents: SubEventCompetitionBuilder[] = [];

  constructor(
    type: LevelType,
    official = true,
    season = 2022,
    usedRanking?: UsedRankingTiming,
    name = "Test Event",
    id?: string
  ) {
    this.event = new EventCompetition({
      id,
      name,
      type,
      official,
      usedRanking: usedRanking ?? { amount: 0, unit: "days" },
      season,
    });
  }

  static Create(
    type: LevelType,
    official = true,
    season = 2022,
    usedRanking?: UsedRankingTiming,
    name = "Test Event",
    id?: string
  ): EventCompetitionBuilder {
    return new EventCompetitionBuilder(type, official, season, usedRanking, name, id);
  }

  WithName(name: string): this {
    this.event.name = name;

    return this;
  }

  WithYear(year: number): this {
    this.event.season = year;

    return this;
  }

  WithOfficial(official: boolean): this {
    this.event.official = official;

    return this;
  }

  WithUsedRanking(usedRanking: UsedRankingTiming): this {
    this.event.usedRankingAmount = usedRanking.amount;
    this.event.usedRankingUnit = usedRanking.unit;

    return this;
  }

  WithSubEvent(subEvent: SubEventCompetitionBuilder): this {
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
