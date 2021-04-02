import { Game } from '../../game.model';
import { CompetitionDraw } from './draw.model';

export class CompetitionEncounter {
  id: string;
  date: Date;
  draw: CompetitionDraw;
  games: Game[];

  constructor(args: Partial<CompetitionEncounter>) {
    this.id = args?.id;
    this.date = args?.date;
    this.draw = args?.draw != null ? new CompetitionDraw(args.draw) : null;
    this.games = args?.games?.map((g) => new Game(g));
  }
}
