import { DrawCompetition, SubEventCompetition } from '../models';
import { EncounterCompetitionBuilder } from './evenCompetitionEncounterBuilder';

export class DrawCompetitionBuilder {
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

  WithEnouncter(encounter: EncounterCompetitionBuilder): DrawCompetitionBuilder {
    encounter.ForDraw(this.draw);
    this.encounters.push(encounter);
    return this;
  }

  async Build(): Promise<DrawCompetition> {
    try {
      await this.draw.save();

      for (const encounter of this.encounters) {
        await encounter.Build();
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
    return this.draw;
  }
}
