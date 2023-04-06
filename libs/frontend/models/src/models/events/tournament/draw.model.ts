import { Game } from '../../game.model';
import { Draw } from '../draw.model';
import { SubEventTournament } from './sub-event.model';

export class DrawTournament extends Draw {
  subEventTournament?: SubEventTournament;
  games?: Game[];

  constructor(args: Partial<DrawTournament>) {
    super(args);
    this.subEventTournament = args.subEventTournament
      ? new SubEventTournament(args.subEventTournament)
      : undefined;
    this.games = args.games?.map((g) => new Game(g));
  }
}
