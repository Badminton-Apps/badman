import { Team } from '../../team.model';
import { SubEvent } from '../sub-event.model';
import { DrawCompetition } from './draw.model';
import { EventCompetition } from './event.model';

export class SubEventCompetition extends SubEvent {
  teams?: Team[];

  eventCompetition?: EventCompetition;
  drawCompetitions?: DrawCompetition[];

  averageLevel?: SubEventCompetitionAverageLevel[];

  constructor({ ...args }: Partial<SubEventCompetition>) {
    super(args);
    this.maxLevel = args?.maxLevel;
    this.minBaseIndex = args?.minBaseIndex;
    this.maxBaseIndex = args?.maxBaseIndex;
    this.teams = args?.teams?.map((t) => new Team(t));

    this.eventCompetition =
      args?.eventCompetition != null ? new EventCompetition(args.eventCompetition) : undefined;
    this.drawCompetitions = args?.drawCompetitions?.map(
      (d) =>
        new DrawCompetition({
          ...d,
          subEventCompetition: this,
        }),
    );
    this.averageLevel = args?.averageLevel?.map((a) => new SubEventCompetitionAverageLevel(a));
  }
}

export class SubEventCompetitionAverageLevel {
  gender?: 'M' | 'F';
  single?: number;
  singleCount?: number;
  double?: number;
  doubleCount?: number;
  mix?: number;
  mixCount?: number;

  constructor({ ...args }: Partial<SubEventCompetitionAverageLevel>) {
    this.gender = args?.gender;
    this.single = args?.single;
    this.singleCount = args?.singleCount;
    this.double = args?.double;
    this.doubleCount = args?.doubleCount;
    this.mix = args?.mix;
    this.mixCount = args?.mixCount;
  }
}
