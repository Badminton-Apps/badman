import { Game } from './game.model';
import { Event } from './event.model';

export class SubEvent {
  id: string;
  drawType: string;
  eventType: string;
  levelType: string;
  name: string;
  event: Event;
  level: number;
  games: Game[];

  constructor({ ...args }: Partial<SubEvent>) {
    this.id = args.id;
    this.drawType = args.drawType;
    this.eventType = args.eventType;
    this.levelType = args.levelType;
    this.name = args.name;
    this.event = args.event;
    this.level = args.level;
    this.games = args.games?.map((g) => new Game(g));
  }
}
