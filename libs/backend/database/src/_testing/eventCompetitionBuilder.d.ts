import { UsedRankingTiming } from '@badman/utils';
import { EventCompetition } from '../models';
import { SubEventCompetitionBuilder } from './eventCompetitionSubEventBuilder';
export declare class EventCompetitionBuilder {
    private build;
    private event;
    private subEvents;
    constructor(id?: string);
    static Create(id?: string): EventCompetitionBuilder;
    WithName(name: string): EventCompetitionBuilder;
    WithYear(year: number): EventCompetitionBuilder;
    WithUsedRanking(usedRanking: UsedRankingTiming): EventCompetitionBuilder;
    WithSubEvent(subEvent: SubEventCompetitionBuilder): EventCompetitionBuilder;
    Build(rebuild?: boolean): Promise<EventCompetition>;
}
