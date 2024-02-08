import { EventEntry } from '../models';
import { DrawCompetitionBuilder } from './eventCompetitionDrawBuilder';
import { SubEventCompetitionBuilder } from './eventCompetitionSubEventBuilder';
import { PlayerBuilder } from './playerBuilder';
import { TeamBuilder } from './teamBuilder';
export declare class EventCompetitionEntryBuilder {
    private build;
    private entry;
    private draw?;
    private subEvent?;
    private team?;
    private basePlayers;
    private index;
    constructor(entryType: 'competition' | 'tournament', id?: string);
    static Create(entryType: 'competition' | 'tournament', id?: string): EventCompetitionEntryBuilder;
    WithBasePlayer(player: PlayerBuilder, single: number, double: number, mix: number): EventCompetitionEntryBuilder;
    WithBaseIndex(index: number): EventCompetitionEntryBuilder;
    WithDrawId(id: string): EventCompetitionEntryBuilder;
    ForDraw(draw: DrawCompetitionBuilder): EventCompetitionEntryBuilder;
    WithSubEventId(id: string): EventCompetitionEntryBuilder;
    ForSubEvent(subEvent: SubEventCompetitionBuilder): EventCompetitionEntryBuilder;
    WithTeamId(id: string): this;
    ForTeam(team: TeamBuilder): EventCompetitionEntryBuilder;
    Build(rebuild?: boolean): Promise<EventEntry>;
}
