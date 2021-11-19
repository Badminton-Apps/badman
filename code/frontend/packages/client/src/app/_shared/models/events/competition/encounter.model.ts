import { Game } from '../../game.model';
import { Team } from '../../team.model';
import { CompetitionDraw } from './draw.model';
import { EncounterChange } from './encounter-change.model';

export class CompetitionEncounter {
  id?: string;
  date?: Date;
  originalDate?: Date;
  draw?: CompetitionDraw;
  games?: Game[];
  home?: Team;
  away?: Team;
  showingForHomeTeam?: boolean;
  encounterChange?: EncounterChange;

  finished = true;

  constructor(args: Partial<CompetitionEncounter>) {
    this.id = args?.id;
    this.date = args.date != null ? new Date(args.date) : undefined;
    this.originalDate = args.originalDate != null ? new Date(args.originalDate) : undefined;
    this.draw = args?.draw != null ? new CompetitionDraw(args.draw) : undefined;
    this.games = args?.games?.map((g) => new Game(g));
    this.home = args?.home != null ? new Team(args.home) : undefined;
    this.away = args?.away != null ? new Team(args.away) : undefined;
    this.encounterChange = args?.encounterChange != null ? new EncounterChange(args.encounterChange) : undefined;

    if (this.encounterChange && this.encounterChange.accepted != true) {
      this.finished = false;
    }
  }
}
