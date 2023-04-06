import { EventType, LevelType } from '@badman/utils';
import { Comment } from '../../comment.model';
import { Event } from '../event.model';
import { SubEventCompetition } from './sub-event.model';

export class EventCompetition extends Event {
  startYear?: number;
  subEventCompetitions?: SubEventCompetition[];
  comments?: Comment[];
  type?: LevelType;

  constructor({ ...args }: Partial<EventCompetition>) {
    super(args);
    this.startYear = args.startYear;
    this.eventType = args.eventType ?? EventType.COMPETITION;
    this.type = args.type;
    this.subEventCompetitions = args?.subEventCompetitions
      ?.map((s) => new SubEventCompetition({ ...s, eventCompetition: this }))
      .sort((a, b) => {
        return (a?.level ?? 0) - (b?.level ?? 0);
      });
    this.comments = args?.comments?.map((c) => new Comment(c));
  }
}