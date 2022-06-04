import { Game } from '../../game.model';
import { Draw } from '../draw.model';
import { TournamentSubEvent } from './sub-event.model';

export class TournamentDraw extends Draw{
  subEventTournament?: TournamentSubEvent;
  games?: Game[];


  constructor(args: Partial<TournamentDraw>) {
    super(args);
    this.subEventTournament = args.subEventTournament ? new TournamentSubEvent(args.subEventTournament) : undefined;
    this.games = args.games?.map((g) => new Game(g));
  }
}
