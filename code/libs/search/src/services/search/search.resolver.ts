import {
  Club,
  EventCompetition,
  EventTournament,
  Player,
} from '@badman/api/database';
import { Args, createUnionType, Query, Resolver } from '@nestjs/graphql';
import { SearchService } from './search.service';

export const Search = createUnionType({
  name: 'Search',
  types: () => [Player, EventCompetition, EventTournament, Club] as const
});

@Resolver(() => Search)
export class SearchResolver {
  constructor(private _SearchService: SearchService) {}

  @Query(() => [Search])
  async search(
    @Args('query') query: string
  ): Promise<(Player | Club | EventCompetition | EventTournament)[]> {
    return this._SearchService.search(query);
  }
}
