import { SubEventCompetition, SubEventTournament } from './events';
import { RankingSystem } from './ranking-system.model';

export class RankingGroup {
  id?: string;
  name?: string;

  subEventCompetitions?: SubEventCompetition[];
  subEventTournament?: SubEventTournament[];
  systems?: RankingSystem[];

  constructor({ ...args }: Partial<RankingGroup>) {
    this.name = args.name;
    this.id = args.id;

    this.subEventCompetitions = args?.subEventCompetitions?.map((g) => new SubEventCompetition(g));
    this.subEventTournament = args?.subEventTournament?.map((g) => new SubEventTournament(g));
    this.systems = args?.systems?.map((g) => new RankingSystem(g));
  }
}
