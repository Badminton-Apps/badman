import { EventType, LevelType, sortSubEvents } from '@badman/utils';
import { Comment } from '../../comment.model';
import { Event } from '../event.model';
import { SubEventCompetition } from './sub-event.model';
import { Exception, InfoEvent } from '../../availibilty.model';

export class EventCompetition extends Event {
  season?: number;
  contactEmail?: string;
  subEventCompetitions?: SubEventCompetition[];
  comments?: Comment[];
  type?: LevelType;
  teamMatcher?: string;

  exceptions?: Exception[];
  infoEvents?: InfoEvent[]

  changeOpenDate?: Date;
  changeCloseDate?: Date;
  changeCloseRequestDate?: Date;
  checkEncounterForFilledIn?: boolean;

  constructor({ ...args }: Partial<EventCompetition>) {
    super(args);
    this.season = args.season;
    this.contactEmail = args.contactEmail;
    this.eventType = args.eventType ?? EventType.COMPETITION;
    this.type = args.type;
    this.teamMatcher = args.teamMatcher;
    this.checkEncounterForFilledIn = args.checkEncounterForFilledIn;
    this.exceptions = args?.exceptions?.map((e) => new Exception(e));
    this.infoEvents = args?.infoEvents?.map((e) => new InfoEvent(e));
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
