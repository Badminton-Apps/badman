import { SubEventTypeEnum, TeamMembershipType } from '@badman/utils';
import { Club, Team } from '../models';
import { ClubBuilder } from './clubBuilder';
import { EventCompetitionEntryBuilder } from './eventCompetitionEntryBuilder';
import { PlayerBuilder } from './playerBuilder';
export declare class TeamBuilder {
    private build;
    private team;
    private players;
    private entries;
    private club?;
    constructor(type: SubEventTypeEnum, id?: string);
    static Create(type: SubEventTypeEnum, id?: string): TeamBuilder;
    WithName(name: string): TeamBuilder;
    WithTeamNumber(number: number): TeamBuilder;
    WithSeason(season: number): TeamBuilder;
    WithId(id: string): TeamBuilder;
    WithPlayer(player: PlayerBuilder, type: TeamMembershipType): TeamBuilder;
    WithEntry(entry: EventCompetitionEntryBuilder): TeamBuilder;
    WithClub(club: ClubBuilder): TeamBuilder;
    ForClub(club: Club): TeamBuilder;
    Build(rebuild?: boolean): Promise<Team>;
}
