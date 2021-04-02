import { PlayerGame } from '../../_shared';
import { CompetitionEncounter, TournamentDraw } from './events';
import { RankingPoint } from './ranking-point.model';
import { RankingSystem } from './ranking-system.model';

export class Game {
  id: string;
  playedAt: Date;
  gameType: GameType | string;
  players: PlayerGame[];
  set1Team1?: number;
  set1Team2?: number;
  set2Team1?: number;
  set2Team2?: number;
  set3Team1?: number;
  set3Team2?: number;
  winner: number;
  rankingPoints: RankingPoint[];
  
  competition: CompetitionEncounter;
  tournament: TournamentDraw;

  constructor({ ...args }: Partial<Game>, rankingType?: RankingSystem) {
    this.id = args.id;
    this.playedAt = args.playedAt;
    this.gameType = args.gameType;
    this.players = args.players;
    this.set1Team1 = args.set1Team1;
    this.set1Team2 = args.set1Team2;
    this.set2Team1 = args.set2Team1;
    this.set2Team2 = args.set2Team2;
    this.set3Team1 = args.set3Team1;
    this.set3Team2 = args.set3Team2;
    this.winner = args.winner;
    this.rankingPoints = args.rankingPoints?.map((r) => new RankingPoint({...r, type: rankingType}));

    // it's should be one or the other
    // Temporary doing this before finding a better way
    if (args.competition) {
      this.competition = new CompetitionEncounter(args.competition);
    } else if (args.tournament) {
      this.tournament = new TournamentDraw(args.tournament);
    }
  }
}

export enum GameType {
  D = 'double',
  MX = 'mix',
  S = 'single',
}
