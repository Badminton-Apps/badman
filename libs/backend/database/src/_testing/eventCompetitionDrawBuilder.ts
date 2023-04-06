import { DrawCompetition, SubEventCompetition } from '../models';
import { EncounterCompetitionBuilder } from './eventCompetitionEncounterBuilder';

export class DrawCompetitionBuilder {
  private build = false;
  
  private draw: DrawCompetition;

  private encounters: EncounterCompetitionBuilder[] = [];

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

  ForSubEvent(event: SubEventCompetition): DrawCompetitionBuilder {
    this.draw.subeventId = event.id;
    return this;
  }

  WithEnouncter(
    encounter: EncounterCompetitionBuilder
  ): DrawCompetitionBuilder {
    encounter.ForDraw(this.draw);
    this.encounters.push(encounter);
    return this;
  }

  async Build(rebuild = false): Promise<DrawCompetition> {
    if (this.build && !rebuild) {
      return this.draw;
    }

    try {
      await this.draw.save();

      for (const encounter of this.encounters) {
        await encounter.Build();
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.draw;
  }
}
