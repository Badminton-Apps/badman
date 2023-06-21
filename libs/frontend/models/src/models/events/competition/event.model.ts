import { EventType, LevelType, sortSubEvents } from '@badman/utils';
import { Comment } from '../../comment.model';
import { Event } from '../event.model';
import { SubEventCompetition } from './sub-event.model';

export class EventCompetition extends Event {
  season?: number;
  subEventCompetitions?: SubEventCompetition[];
  comments?: Comment[];
  type?: LevelType;

  changeOpenDate?: Date;
  changeCloseDate?: Date;
  changeCloseRequestDate?: Date;

  constructor({ ...args }: Partial<EventCompetition>) {
    super(args);
    this.season = args.season;
    this.eventType = args.eventType ?? EventType.COMPETITION;
    this.type = args.type;
    this.changeOpenDate = args.changeOpenDate
      ? new Date(args.changeOpenDate)
      : undefined;

    this.changeCloseDate = args.changeCloseDate
      ? new Date(args.changeCloseDate)
      : undefined;

    this.changeCloseRequestDate = args.changeCloseRequestDate
      ? new Date(args.changeCloseRequestDate)
      : undefined;

    this.subEventCompetitions = args?.subEventCompetitions
      ?.map((s) => new SubEventCompetition({ ...s, eventCompetition: this }))
      .sort(sortSubEvents);
    this.comments = args?.comments?.map((c) => new Comment(c));
  }
}
