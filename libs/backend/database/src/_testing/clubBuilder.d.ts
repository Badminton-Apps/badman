import { Club } from '../models';
import { TeamBuilder } from './teamBuilder';
export declare class ClubBuilder {
    private build;
    private club;
    private teams;
    constructor(id?: string);
    static Create(id?: string): ClubBuilder;
    WithName(name: string): ClubBuilder;
    WithId(id: string): ClubBuilder;
    WithTeam(team: TeamBuilder): ClubBuilder;
    Build(rebuild?: boolean): Promise<Club>;
}
