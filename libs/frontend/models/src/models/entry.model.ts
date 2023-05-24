import {
  DrawCompetition,
  SubEventCompetition,
  DrawTournament,
  SubEventTournament,
} from './events';
import { Player } from './player.model';
import { Standing } from './standing.model';
import { Team } from './team.model';
import { TeamValidationResult } from './validation';

export class EventEntry {
  id?: string;

  subEventCompetition?: SubEventCompetition;
  drawCompetition?: DrawCompetition;

  subEventTournament?: SubEventTournament;
  drawTournament?: DrawTournament;

  subEventId?: string;
  drawId?: string;

  standing?: Standing;

  entryType?: string;

  teamId?: string;

  team?: Team;
  players?: Player[];
  meta?: Meta;

  enrollmentValidation?: TeamValidationResult;

  constructor({ ...args }: Partial<EventEntry>) {
    this.id = args.id;

    this.subEventCompetition =
      args?.subEventCompetition != null
        ? new SubEventCompetition(args?.subEventCompetition)
        : undefined;
    this.drawCompetition =
      args?.drawCompetition != null
        ? new DrawCompetition(args?.drawCompetition)
        : undefined;
    this.subEventTournament =
      args?.subEventTournament != null
        ? new SubEventTournament(args?.subEventTournament)
        : undefined;
    this.drawTournament =
      args?.drawTournament != null
        ? new DrawTournament(args?.drawTournament)
        : undefined;

    this.subEventId = args?.subEventId;
    this.drawId = args?.drawId;
    this.teamId = args?.teamId;

    this.team = args?.team != null ? new Team(args?.team) : undefined;
    this.standing =
      args?.standing != null ? new Standing(args?.standing) : undefined;
    this.players = args?.players?.map((p) => new Player(p));

    this.enrollmentValidation = args?.enrollmentValidation;

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
  players: EntryCompetitionPlayer[];
}

export interface EntryCompetitionPlayer {
  id: string;
  single: number;
  double: number;
  mix: number;
  gender: 'M' | 'F';
  player: Partial<Player>;
  levelException: boolean;
}
