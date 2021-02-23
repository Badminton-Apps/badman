import { PlayerGame } from '../../_shared';
import { Draw } from './draw.model';
import { SubEvent } from './sub-event.model';
import { RankingPoint } from "./ranking-point.model";

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
  draw: Draw;

  // internal
  drawCompetition: Draw;
  drawTournament: Draw;

  constructor(args: Partial<Game>) {
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
    this.rankingPoints = args.rankingPoints?.map(r => new RankingPoint(r));

    // it's usually on or the other
    // Temporary doing this
    if (args.drawCompetition) {
      this.draw = new Draw(args.drawCompetition);
    } else if (args.drawTournament) {
      this.draw = new Draw(args.drawTournament);
    }
  }
}

export enum GameType {
  D = 'double',
  MX = 'mix',
  S = 'single',
}
