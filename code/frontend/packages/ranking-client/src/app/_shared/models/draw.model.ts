import { Game } from './game.model';
import { SubEvent } from './sub-event.model';

export class Draw {
  id: string;
  name: string;
  type: string;
  size: number;

  subEvent: SubEvent;
  games: Game[];

  constructor({ ...args }: Partial<Draw>) {
    this.id = args.id;
    this.name = args.name;
    this.type = args.type;
    this.size = args.size;
    this.subEvent = args.subEvent ? new SubEvent(args.subEvent) : null;
    this.games = args.games?.map((g) => new Game(g));
  }
}
