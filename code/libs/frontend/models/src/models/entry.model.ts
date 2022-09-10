import {
  CompetitionDraw,
  SubEventCompetition,
  DrawTournament,
  SubEventTournament,
} from './events';
import { Player } from './player.model';
import { Standing } from './standing.model';
import { Team } from './team.model';

export class Entry {
  id?: string;

  competitionSubEvent?: SubEventCompetition;
  competitionDraw?: CompetitionDraw;

  tournamentSubEvent?: SubEventTournament;
  tournamentDraw?: DrawTournament;

  standing?: Standing;

  entryType?: string;

  team?: Team;
  players?: Player[];
  meta?: Meta;

  constructor({ ...args }: Partial<Entry>) {
    this.id = args.id;

    this.competitionSubEvent =
      args?.competitionSubEvent != null
        ? new SubEventCompetition(args?.competitionSubEvent)
        : undefined;
    this.competitionDraw =
      args?.competitionDraw != null
        ? new CompetitionDraw(args?.competitionDraw)
        : undefined;
    this.tournamentSubEvent =
      args?.tournamentSubEvent != null
        ? new SubEventTournament(args?.tournamentSubEvent)
        : undefined;
    this.tournamentDraw =
      args?.tournamentDraw != null
        ? new DrawTournament(args?.tournamentDraw)
        : undefined;

    this.team = args?.team != null ? new Team(args?.team) : undefined;
    this.standing =
      args?.standing != null ? new Standing(args?.standing) : undefined;
    this.players = args?.players?.map((p) => new Player(p));

    this.meta = args?.meta;
    this.entryType = args?.entryType;
  }
}

export interface Meta {
  tournament?: EntryTournament;
  competition?: EntryCompetition;
}

export interface EntryTournament {
  place: number;
}

export interface EntryCompetition {
  teamIndex: number;
  players: EntryCompetitionPlayers[];
}

export interface EntryCompetitionPlayers {
  id: string;
  single: number;
  double: number;
  mix: number;
  gender: string;
  player: Partial<Player>;
}
