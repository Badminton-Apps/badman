import { CompetitionSubEvent, TournamentSubEvent } from './events';
import { RankingSystem } from './ranking-system.model';

export class RankingSystemGroup {
  id?: string;
  name?: string;

  subEventCompetitions?: CompetitionSubEvent[];
  subEventTournament?: TournamentSubEvent[];
  systems?: RankingSystem[];

  constructor({ ...args }: Partial<RankingSystemGroup>) {
    this.name = args.name;
    this.id = args.id;

    this.subEventCompetitions = args?.subEventCompetitions?.map((g) => new CompetitionSubEvent(g));
    this.subEventTournament = args?.subEventTournament?.map((g) => new TournamentSubEvent(g));
    this.systems = args?.systems?.map((g) => new RankingSystem(g));

  }
}
