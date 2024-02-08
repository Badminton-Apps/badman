import { SubEventTypeEnum } from '@badman/utils';
import { SubEventCompetition } from '../models';
import { EventCompetitionBuilder } from './eventCompetitionBuilder';
import { DrawCompetitionBuilder } from './eventCompetitionDrawBuilder';
import { SystemGroupBuilder } from './systemGroupBuilder';
import { EventCompetitionEntryBuilder } from './eventCompetitionEntryBuilder';
export declare class SubEventCompetitionBuilder {
    private build;
    private subEvent;
    private draws;
    private entries;
    constructor(type: SubEventTypeEnum);
    static Create(type: SubEventTypeEnum): SubEventCompetitionBuilder;
    WithName(firstName: string): SubEventCompetitionBuilder;
    WithId(id: string): SubEventCompetitionBuilder;
    WithIndex(minBaseIndex: number, maxBaseIndex: number): SubEventCompetitionBuilder;
    WitnMaxLevel(maxLevel: number): SubEventCompetitionBuilder;
    WithEventId(eventId: string): SubEventCompetitionBuilder;
    ForEvent(event: EventCompetitionBuilder): SubEventCompetitionBuilder;
    WithGroup(group: SystemGroupBuilder): this;
    WithDraw(draw: DrawCompetitionBuilder): SubEventCompetitionBuilder;
    WithEntry(entry: EventCompetitionEntryBuilder): SubEventCompetitionBuilder;
    Build(rebuild?: boolean): Promise<SubEventCompetition>;
}
