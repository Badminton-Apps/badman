import { Game } from '../../game.model';
import { Team } from '../../team.model';
import { CompetitionDraw } from './draw.model';
import { EncounterChange } from './encounter-change.model';

export class CompetitionEncounter {
  id?: string;
  date?: Date;
  originalDate?: Date;
  drawCompetition?: CompetitionDraw;
  games?: Game[];
  homeScore?: number;
  awayScore?: number;
  home?: Team;
  away?: Team;
  drawId?: string;

  homeTeamId?: string;
  awayTeamId?: string;

  showingForHomeTeam?: boolean;
  encounterChange?: EncounterChange;

  finished = true;

  constructor(args: Partial<CompetitionEncounter>) {
    this.id = args?.id;
    this.date = args.date != null ? new Date(args.date) : undefined;
    this.originalDate =
      (args.originalDate) != null ? new Date(args.originalDate) : undefined;
    this.drawCompetition =
      args?.drawCompetition != null
        ? new CompetitionDraw(args.drawCompetition)
        : undefined;
    this.drawId = args?.drawId;
    this.games = args?.games
      ?.map((g) => new Game(g))
      ?.sort((a, b) => {
        const aSort =
          (a.order ?? null) != null
            ? a.order
            : (a.round ?? null) != null
            ? parseInt(a.round?.replace('R', '') ?? '', 10)
            : 0;
        const bSort =
          (b.order ?? null) != null
            ? b.order
            : (b.round ?? null) != null
            ? parseInt(b.round?.replace('R', '') ?? '', 10)
            : 0;

        return (aSort ?? 0) - (bSort ?? 0);
      });
    this.home = args?.home != null ? new Team(args.home) : undefined;
    this.away = args?.away != null ? new Team(args.away) : undefined;
    this.homeScore = args?.homeScore;
    this.awayScore = args?.awayScore;
    this.encounterChange =
      args?.encounterChange != null
        ? new EncounterChange(args.encounterChange)
        : undefined;

    this.homeTeamId = args?.homeTeamId;
    this.awayTeamId = args?.awayTeamId;

    if (this.encounterChange && this.encounterChange.accepted != true) {
      this.finished = false;
    }
  }
}
