import { Game } from './game.model';
import { Player } from "./player.model";
import {RankingSystem} from "./ranking-system.model";

export class RankingPoint {
  points?: number;
  player?: Player;
  game?: Game;
  type?: RankingSystem;
  rankingDate?: Date;
  differenceInLevel?: number;
  systemId?: number;

  constructor({ ...args }: Partial<RankingPoint>) {
    this.points = args.points;
    this.player = args.player ? new Player(args.player) : undefined;
    this.game = args.game ? new Game(args.game) : undefined;
    this.type = args.type ? new RankingSystem(args.type) : undefined;
    this.rankingDate = args.rankingDate;
    this.differenceInLevel = args.differenceInLevel;
    this.systemId = args.systemId;
  }
}
