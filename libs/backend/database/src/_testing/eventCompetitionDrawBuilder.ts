import { DrawCompetition } from '../models';
import { EncounterCompetitionBuilder } from './eventCompetitionEncounterBuilder';
import { EventCompetitionEntryBuilder } from './eventCompetitionEntryBuilder';
import { SubEventCompetitionBuilder } from './eventCompetitionSubEventBuilder';

export class DrawCompetitionBuilder {
  private build = false;

  private draw: DrawCompetition;

  private encounters: EncounterCompetitionBuilder[] = [];
  private entries: EventCompetitionEntryBuilder[] = [];

  constructor() {
    this.draw = new DrawCompetition();
  }

  static Create(): DrawCompetitionBuilder {
    return new DrawCompetitionBuilder();
  }

  WithName(firstName: string): DrawCompetitionBuilder {
    this.draw.name = firstName;

    return this;
  }

  WithId(id: string): DrawCompetitionBuilder {
    this.draw.id = id;
    return this;
  }

  ForSubEvent(subEvent: SubEventCompetitionBuilder): DrawCompetitionBuilder {
    subEvent.WithDraw(this);
    return this;
  }

  WithEnouncter(encounter: EncounterCompetitionBuilder): DrawCompetitionBuilder {
    this.encounters.push(encounter);
    return this;
  }

  WithEntry(entry: EventCompetitionEntryBuilder): DrawCompetitionBuilder {
    this.entries.push(entry);
    return this;
  }

  async Build(rebuild = false): Promise<DrawCompetition> {
    if (this.build && !rebuild) {
      return this.draw;
    }

    try {
      await this.draw.save();

      for (const encounter of this.encounters) {
        const enc = await encounter.Build();
        await this.draw.addEncounterCompetition(enc);
      }

      for (const entry of this.entries) {
        entry.WithDrawId(this.draw.id);
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.draw;
  }
}
