import { PlayerGame } from '../../_shared';
import { CompetitionEncounter, TournamentDraw } from './events';
import { RankingPoint } from './ranking-point.model';
import { RankingSystem } from './ranking-system.model';

export class Game {
  id?: string;
  playedAt?: Date;
  gameType?: GameType;
  round?: string;
  order?: number;
  linkType?: string;
  players?: PlayerGame[];
  set1Team1?: number;
  set1Team2?: number;
  set2Team1?: number;
  set2Team2?: number;
  set3Team1?: number;
  set3Team2?: number;

  set1Winner?: number = 0;
  set2Winner?: number = 0;
  set3Winner?: number = 0;

  status?: GameStatus;
  winner?: number;
  rankingPoints?: RankingPoint[];

  competition?: CompetitionEncounter;
  tournament?: TournamentDraw;

  constructor({ ...args }: Partial<Game>, rankingType?: RankingSystem) {
    const parsedType = (args?.gameType as unknown as GameType) ?? null;
    const parsedStatus =
      (args?.status as unknown as GameStatus) ?? GameStatus.NORMAL;

    this.id = args?.id;
    this.playedAt = args.playedAt ? new Date(args.playedAt) : undefined;
    this.gameType = parsedType != null ? GameType[parsedType] : undefined;
    this.status = parsedStatus != null ? GameStatus[parsedStatus] : undefined;
    this.players = args?.players?.map((r) => new PlayerGame(r));
    this.set1Team1 = args.set1Team1;
    this.set1Team2 = args.set1Team2;
    this.set2Team1 = args.set2Team1;
    this.set2Team2 = args.set2Team2;
    this.set3Team1 = args.set3Team1;
    this.set3Team2 = args.set3Team2;
    this.round = args?.round;
    this.order = args?.order;
    this.winner = args.winner;
    this.linkType = args?.linkType;
    this.rankingPoints = args.rankingPoints?.map(
      (r) => new RankingPoint({ ...r, type: rankingType })
    );

    if (args?.set1Team1 && args?.set1Team2) {
      this.set1Winner = args.set1Team1 > args.set1Team2 ? 1 : 2;
    }

    if (args?.set2Team1 && args?.set2Team2) {
      this.set2Winner = args.set2Team1 > args.set2Team2 ? 1 : 2;
    }

    if (args?.set3Team1 && args?.set3Team2) {
      this.set3Winner = args.set3Team1 > args.set3Team2 ? 1 : 2;
    }

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

export enum GameStatus {
  NORMAL = 'NORMAL',
  WALKOVER = 'WALKOVER',
  RETIREMENT = 'RETIREMENT',
  DISQUALIFIED = 'DISQUALIFIED',
  NO_MATCH = 'NO_MATCH',
}
