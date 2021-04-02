import { CompetitionEvent } from '.';
import { Team } from '../../team.model';
import { SubEvent } from '../sub-event.model';
import { CompetitionDraw } from './draw.model';

export class CompetitionSubEvent extends SubEvent {
  maxLevel: number;
  minBaseIndex: number;
  maxBaseIndex: number;
  levelType: string;
  teams: Team[];

  event: CompetitionEvent;
  draws: CompetitionDraw[];

  constructor({ ...args }: Partial<CompetitionSubEvent>) {
    super(args);
    this.maxLevel = args.maxLevel ?? 0;
    this.levelType = args.levelType;
    this.minBaseIndex = args.minBaseIndex ?? 0;
    this.maxBaseIndex = args.maxBaseIndex ?? 0;
    this.teams = [];

    this.event = args?.event != null ? new CompetitionEvent(args.event) : null;
    this.draws = args?.draws?.map((d) => new CompetitionDraw(d));
  }
}
