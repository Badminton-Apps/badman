import { EventTournament } from '../models';
import { SubEventTournamentBuilder } from './eventTournamentSubEventBuilder';
export declare class EventTournamentBuilder {
    private build;
    private event;
    private subEvents;
    constructor(id?: string);
    static Create(id?: string): EventTournamentBuilder;
    WithName(firstName: string): EventTournamentBuilder;
    WithSubEvent(subEvent: SubEventTournamentBuilder): EventTournamentBuilder;
    Build(rebuild?: boolean): Promise<EventTournament>;
}
