import { SubEventTournament } from '../models';
import { EventTournamentBuilder } from './eventTournamentBuilder';
import { DrawTournamentBuilder } from './eventTournamentDrawBuilder';
import { SystemGroupBuilder } from './systemGroupBuilder';
export declare class SubEventTournamentBuilder {
    private build;
    private subEvent;
    private draws;
    constructor();
    static Create(): SubEventTournamentBuilder;
    WithName(firstName: string): SubEventTournamentBuilder;
    WithId(id: string): SubEventTournamentBuilder;
    ForEvent(event: EventTournamentBuilder): SubEventTournamentBuilder;
    WithGroup(group: SystemGroupBuilder): this;
    WithDraw(draw: DrawTournamentBuilder): SubEventTournamentBuilder;
    Build(rebuild?: boolean): Promise<SubEventTournament>;
}
