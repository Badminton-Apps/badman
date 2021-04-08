import { Comment } from '../../comment.model';
import { Event, EventType } from '../event.model';
import { CompetitionSubEvent } from './sub-event.model';

export class CompetitionEvent extends Event {
  startYear: number;
  type: string;
  subEvents: CompetitionSubEvent[];
  comments: Comment[];

  constructor({ ...args }: Partial<CompetitionEvent>) {
    super(args);
    this.startYear = args.startYear;
    this.eventType = args.eventType ?? EventType.COMPETITION;
    this.type = args.type;
    this.subEvents = args?.subEvents?.map(
      (s) => new CompetitionSubEvent({ ...s, levelType: args.type })
    );
    this.comments = args?.comments?.map((c) => new Comment(c));
  }
}
