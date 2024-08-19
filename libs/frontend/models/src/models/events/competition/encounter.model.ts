import { Game } from '../../game.model';
import { Team } from '../../team.model';
import { Location } from '../../location.model';
import { Assembly } from './assembly.model';
import { DrawCompetition } from './draw.model';
import { EncounterChange } from './encounter-change.model';
import { Player } from '../../player.model';
import { sortGames } from '@badman/utils';

export class EncounterCompetition {
  id?: string;
  date?: Date;
  originalDate?: Date;
  drawCompetition?: DrawCompetition;
  visualCode?: string;
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

  shuttle?: string;
  startHour?: string;
  endHour?: string;
  gameLeader?: Player;

  homeTeamId?: string;
  awayTeamId?: string;

  showingForHomeTeam?: boolean;
  encounterChange?: EncounterChange;

  validateEncounter?: {
    valid: boolean;
    errors: {
      params: { [key: string]: unknown };
      message: string;
    }[];
    warnings: {
      params: { [key: string]: unknown };
      message: string;
    }[];
  };

  constructor(args?: Partial<EncounterCompetition>) {
    this.id = args?.id;
    this.date = args?.date != null ? new Date(args?.date) : undefined;
    this.originalDate = args?.originalDate != null ? new Date(args?.originalDate) : undefined;
    this.drawCompetition =
      (args?.drawCompetition ?? null) != null
        ? new DrawCompetition(args?.drawCompetition)
        : undefined;

    this.assemblies = args?.assemblies?.map((a) => new Assembly(a)) ?? [];
    this.drawId = args?.drawId;
    this.visualCode = args?.visualCode;
    this.locationId = args?.locationId || args?.location?.id;
    this.location = (args?.location ?? null) != null ? new Location(args?.location) : undefined;

    this.shuttle = args?.shuttle;
    this.startHour = args?.startHour;
    this.endHour = args?.endHour;
    this.gameLeader = (args?.gameLeader ?? null) != null ? new Player(args?.gameLeader) : undefined;

    this.games = args?.games?.map((g) => new Game(g))?.sort(sortGames);
    this.home = args?.home != null ? new Team(args.home) : undefined;
    this.away = args?.away != null ? new Team(args.away) : undefined;

    this.homeScore = args?.homeScore;
    this.awayScore = args?.awayScore;
    this.encounterChange =
      args?.encounterChange != null ? new EncounterChange(args.encounterChange) : undefined;

    this.homeTeamId = args?.homeTeamId;
    this.awayTeamId = args?.awayTeamId;

    this.validateEncounter = args?.validateEncounter;
  }
}
