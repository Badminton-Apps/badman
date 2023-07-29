import { Game } from '../../game.model';
import { Team } from '../../team.model';
import { Location } from '../../location.model';
import { Assembly } from './assembly.model';
import { DrawCompetition } from './draw.model';
import { EncounterChange } from './encounter-change.model';

export class EncounterCompetition {
  id?: string;
  date?: Date;
  originalDate?: Date;
  drawCompetition?: DrawCompetition;
  assemblies: Assembly[];
  games?: Game[];
  homeScore?: number;
  awayScore?: number;
  home?: Team;
  away?: Team;
  drawId?: string;
  locationId?: string;
  location?: Location;
  originalLocationId?: Date;
  originalLocation?: Location;


  homeTeamId?: string;
  awayTeamId?: string;

  showingForHomeTeam?: boolean;
  encounterChange?: EncounterChange;

  constructor(args?: Partial<EncounterCompetition>) {
    this.id = args?.id;
    this.date = args?.date != null ? new Date(args?.date) : undefined;
    this.originalDate =
      args?.originalDate != null ? new Date(args?.originalDate) : undefined;
    this.drawCompetition =
      (args?.drawCompetition ?? null) != null
        ? new DrawCompetition(args?.drawCompetition)
        : undefined;

    this.assemblies = args?.assemblies?.map((a) => new Assembly(a)) ?? [];
    this.drawId = args?.drawId;
    this.locationId = args?.locationId || args?.location?.id;
    this.location =
      (args?.location ?? null) != null
        ? new Location(args?.location)
        : undefined;


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
  }
}
