import { GameStatus, GameType } from '@badman/utils';
import { DrawTournament, EncounterCompetition } from './events';
import { GamePlayer } from './player.model';
import { RankingPoint } from './ranking-point.model';

export class Game {
  id?: string;
  playedAt?: Date;
  gameType?: GameType;
  round?: string;
  order?: number;
  linkType?: string;
  linkId?: string;
  players?: GamePlayer[];
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

  competition?: EncounterCompetition;
  tournament?: DrawTournament;

  constructor({ ...args }: Partial<Game>) {
    const parsedType = (args?.gameType as unknown as 'D' | 'MX' | 'S') ?? null;
    const parsedStatus = (args?.status as unknown as GameStatus) ?? GameStatus.NORMAL;

    this.id = args?.id;
    this.playedAt = args.playedAt ? new Date(args.playedAt) : undefined;
    this.gameType = parsedType != null ? GameType[parsedType] : undefined;
    this.status = parsedStatus != null ? GameStatus[parsedStatus] : undefined;
    this.players = args?.players?.map((r) => new GamePlayer(r));
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
    this.linkId = args?.linkId;
    this.rankingPoints = args.rankingPoints?.map((r) => new RankingPoint(r));

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
      this.competition = new EncounterCompetition(args.competition);
    } else if (args.tournament) {
      this.tournament = new DrawTournament(args.tournament);
    }
  }
}
