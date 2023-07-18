import { Club, EventCompetition, EventTournament, Player } from '@badman/backend-database';
export declare class SearchService {
    search(query: string): Promise<(Player | Club | EventCompetition | EventTournament)[]>;
    private _getPlayerResult;
    private _getCompetitionEvents;
    private _getTournamnetsEvents;
    private _getClubs;
}
