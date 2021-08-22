import { Game } from '../game.model';
import { Event } from './event.model';
import { Draw } from './draw.model';

export class SubEvent {
  id: string;
  name: string;
  eventType: string;
  gameType: string;
  level: number;
  maxLevel: number;
  minBaseIndex: number;
  maxBaseIndex: number;

  draws: Draw[];
  games: Game[];
  meta: any;

  constructor(args: Partial<SubEvent>) {
    this.id = args?.id;
    this.meta = args?.meta;
    this.gameType = args?.gameType;
    this.eventType = args?.eventType;
    this.name = args?.name;
    this.level = args?.level;
    this.draws = args?.draws?.map((g) => new Draw(g));
    this.maxLevel = args?.maxLevel;
    this.minBaseIndex = args?.minBaseIndex;
    this.maxBaseIndex = args?.maxBaseIndex;
  }
}
