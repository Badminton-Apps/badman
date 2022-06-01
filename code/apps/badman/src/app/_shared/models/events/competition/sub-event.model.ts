import { EventCompetition } from '.';
import { Team } from '../../team.model';
import { SubEvent } from '../sub-event.model';
import { CompetitionDraw } from './draw.model';

export class CompetitionSubEvent extends SubEvent {
  teams?: Team[];

  event?: EventCompetition;

  constructor({ ...args }: Partial<CompetitionSubEvent>) {
    super(args);
    this.maxLevel = args.maxLevel ?? 0;
    this.minBaseIndex = args.minBaseIndex ?? 0;
    this.maxBaseIndex = args.maxBaseIndex ?? 0;
    this.teams = [];

    this.event = args?.event != null ? new EventCompetition(args.event) : undefined;
    this.draws = args?.draws?.map((d) => new CompetitionDraw(d));
  }
}
