import { Club, EventCompetition, EventTournament, Player } from '@badman/backend-database';
import { SearchService } from './search.service';
export declare const Search: EventCompetition | Club | Player | EventTournament;
export declare class SearchResolver {
    private _searchService;
    constructor(_searchService: SearchService);
    search(query: string): Promise<(Player | Club | EventCompetition | EventTournament)[]>;
}
