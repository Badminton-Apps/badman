import {
  DrawCompetition,
  EventEntry,
  SubEventCompetition,
  Team,
} from '../models';
import { PlayerBuilder } from './playerBuilder';

export class EventCompetitionEntryBuilder {
  private build = false;

  private entry: EventEntry;

  private basePlayers: {
    player: PlayerBuilder;
    single: number;
    double: number;
    mix: number;
  }[] = [];

  private index = -1;

  constructor(entryType: 'competition' | 'tournament', id?: string) {
    this.entry = new EventEntry({
      id,
      entryType,
    });
  }

  static Create(
    entryType: 'competition' | 'tournament',
    id?: string
  ): EventCompetitionEntryBuilder {
    return new EventCompetitionEntryBuilder(entryType, id);
  }

 
  WithBasePlayer(
    player: PlayerBuilder,
    single: number,
    double: number,
    mix: number
  ): EventCompetitionEntryBuilder {
    this.basePlayers.push({
      player,
      single,
      double,
      mix,
    });

    return this;
  }

  WithBaseIndex(index: number): EventCompetitionEntryBuilder {
    this.index = index;
    return this;
  }

  ForDraw(draw: DrawCompetition): EventCompetitionEntryBuilder {
    this.entry.drawId = draw.id;
    return this;
  }

  ForSubEvent(subEvent: SubEventCompetition): EventCompetitionEntryBuilder {
    this.entry.subEventId = subEvent.id;
    return this;
  }

  ForTeam(team: Team): EventCompetitionEntryBuilder {
    this.entry.teamId = team.id;
    return this;
  }


  async Build(rebuild = false): Promise<EventEntry> {
    if (this.build && !rebuild) {
      return this.entry;
    }

    try {
      if (this.basePlayers) {
        this.entry.meta = {
          competition: {
            players: [],
            teamIndex: this.index,
          },
        };
      }

      for (const basePlayer of this.basePlayers) {
        const player = await basePlayer.player.Build();
        this.entry.meta?.competition?.players.push({
          id: player.id,
          gender: player.gender,
          single: basePlayer.single,
          double: basePlayer.double,
          mix: basePlayer.mix,
        });
      }

      await this.entry.save();
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.entry;
  }
}
