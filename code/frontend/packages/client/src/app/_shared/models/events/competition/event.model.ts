import { Comment } from '../../comment.model';
import { Event, EventType } from '../event.model';
import { CompetitionSubEvent } from './sub-event.model';

export class CompetitionEvent extends Event {
  startYear?: number;
  override subEvents?: CompetitionSubEvent[];
  comments?: Comment[];
  type?: LevelType;

  constructor({ ...args }: Partial<CompetitionEvent>) {
    super(args);
    this.startYear = args.startYear;
    this.eventType = args.eventType ?? EventType.COMPETITION;
    this.type = args.type;
    this.subEvents = args?.subEvents
      ?.map((s) => new CompetitionSubEvent(s))
      .sort((a, b) => (a?.level ?? 0) - (b?.level ?? 0))
      .sort((a, b) => (a?.levelType ?? 'A').localeCompare(b?.levelType ?? 'A'));
    this.comments = args?.comments?.map((c) => new Comment(c));
  }
}

export enum LevelType {
  PROV = 'PROV',
  LIGA = 'LIGA',
  NATIONAL = 'NATIONAL',
}
