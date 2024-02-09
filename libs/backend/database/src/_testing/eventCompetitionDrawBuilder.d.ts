import { DrawCompetition } from '../models';
import { EncounterCompetitionBuilder } from './eventCompetitionEncounterBuilder';
import { EventCompetitionEntryBuilder } from './eventCompetitionEntryBuilder';
import { SubEventCompetitionBuilder } from './eventCompetitionSubEventBuilder';
export declare class DrawCompetitionBuilder {
    private build;
    private draw;
    private encounters;
    private entries;
    constructor();
    static Create(): DrawCompetitionBuilder;
    WithName(firstName: string): DrawCompetitionBuilder;
    WithId(id: string): DrawCompetitionBuilder;
    ForSubEvent(subEvent: SubEventCompetitionBuilder): DrawCompetitionBuilder;
    WithEnouncter(encounter: EncounterCompetitionBuilder): DrawCompetitionBuilder;
    WithEntry(entry: EventCompetitionEntryBuilder): DrawCompetitionBuilder;
    Build(rebuild?: boolean): Promise<DrawCompetition>;
}
