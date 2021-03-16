import { Game } from './game.model';
import { Event } from './event.model';
import { Draw } from './draw.model';
import { Team } from './team.model';

export class SubEvent {
  id: string;
  name: string;
  eventType: string;
  gameType: string;
  level: number;

  event: Event;
  draws: Draw[];
  games: Game[];

  constructor(args: Partial<SubEvent>) {
    this.id = args.id;
    this.gameType = args.gameType;
    this.eventType = args.eventType;
    this.name = args.name;
    this.event = args.event ? new Event(args.event) : null;
    this.level = args.level;
    this.draws = args.draws?.map((g) => new Draw(g));
  }
}

export class CompetitionSubEvent extends SubEvent {
  maxLevel: number;
  minBaseIndex: number;
  maxBaseIndex: number;
  levelType: string;
  teams: Team[];

  constructor({ ...args }: Partial<CompetitionSubEvent>) {
    super(args);
    this.levelType = args.levelType;
    this.maxLevel = args.maxLevel ?? 0;
    this.minBaseIndex = args.minBaseIndex ?? 0;
    this.maxBaseIndex = args.maxBaseIndex ?? 0;
    this.teams = [];
  }
}

export class TournamentSubEvent extends SubEvent {
  constructor({ ...args }: Partial<TournamentSubEvent>) {
    super(args);
  }
}
