import { EventEntry } from '../models';
import { DrawCompetitionBuilder } from './eventCompetitionDrawBuilder';
import { SubEventCompetitionBuilder } from './eventCompetitionSubEventBuilder';
import { PlayerBuilder } from './playerBuilder';
import { TeamBuilder } from './teamBuilder';

export class EventCompetitionEntryBuilder {
  private build = false;

  private entry: EventEntry;

  private draw?: DrawCompetitionBuilder;
  private subEvent?: SubEventCompetitionBuilder;
  private team?: TeamBuilder;

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
    id?: string,
  ): EventCompetitionEntryBuilder {
    return new EventCompetitionEntryBuilder(entryType, id);
  }

  WithBasePlayer(
    player: PlayerBuilder,
    single: number,
    double: number,
    mix: number,
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

  WithDrawId(id: string): EventCompetitionEntryBuilder {
    this.entry.drawId = id;
    return this;
  }

  ForDraw(draw: DrawCompetitionBuilder): EventCompetitionEntryBuilder {
    draw.WithEntry(this);
    return this;
  }

  WithSubEventId(id: string): EventCompetitionEntryBuilder {
    this.entry.subEventId = id;
    return this;
  }

  ForSubEvent(subEvent: SubEventCompetitionBuilder): EventCompetitionEntryBuilder {
    subEvent.WithEntry(this);
    return this;
  }

  WithTeamId(id: string) {
    this.entry.teamId = id;
    return this;
  }

  ForTeam(team: TeamBuilder): EventCompetitionEntryBuilder {
    this.team = team;
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
