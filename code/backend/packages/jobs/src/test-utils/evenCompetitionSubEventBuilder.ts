import { EventCompetition, SubEventCompetition } from '@badvlasim/shared';
import { DrawCompetitionBuilder } from './evenCompetitionDrawBuilder';
import { SystemGroupBuilder } from './systemGroupBuilder';

export class SubEventCompetitionBuilder {
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

  ForEvent(event: EventCompetition): SubEventCompetitionBuilder {
    this.subEvent.eventId = event.id;
    return this;
  }

  WithGroup(group: SystemGroupBuilder){
    group.WithCompetition(this.subEvent);
    return this;
  }


  WithDraw(draw: DrawCompetitionBuilder): SubEventCompetitionBuilder {
    draw.ForSubEvent(this.subEvent);
    this.draws.push(draw);
    return this;
  }

  async Build(): Promise<SubEventCompetition> {
    try {
      await this.subEvent.save();

      for (const draw of this.draws) {
        await draw.Build()
      }
    } catch (error) {
      console.log(error);
      throw error;
    }

    return this.subEvent;
  }
}
