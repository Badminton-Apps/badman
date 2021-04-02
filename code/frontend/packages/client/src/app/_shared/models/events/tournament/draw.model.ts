import { Game } from '../../game.model';
import { Draw } from '../draw.model';
import { TournamentSubEvent } from './sub-event.model';

export class TournamentDraw extends Draw{
  subEvent: TournamentSubEvent;
  games: Game[];


  constructor(args: Partial<TournamentDraw>) {
    super(args);
    this.subEvent = args.subEvent ? new TournamentSubEvent(args.subEvent) : null;
    this.games = args.games?.map((g) => new Game(g));
  }
}
