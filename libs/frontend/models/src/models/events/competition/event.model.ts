import { EventType, LevelType, sortSubEvents } from '@badman/utils';
import { Comment } from '../../comment.model';
import { Event } from '../event.model';
import { SubEventCompetition } from './sub-event.model';
import { Exception, InfoEvent } from '../../availibilty.model';

export class EventCompetition extends Event {
  season?: number;
  contactEmail?: string;
  contactId?: string;
  subEventCompetitions?: SubEventCompetition[];
  comments?: Comment[];
  type?: LevelType;
  state?: string;
  country?: string;
  teamMatcher?: string;

  exceptions?: Exception[];
  infoEvents?: InfoEvent[];

  changeOpenDate?: Date;
  changeCloseDatePeriod1?: Date;
  changeCloseDatePeriod2?: Date;
  changeCloseRequestDatePeriod1?: Date;
  changeCloseRequestDatePeriod2?: Date;
  checkEncounterForFilledIn?: boolean;

  constructor({ ...args }: Partial<EventCompetition>) {
    super(args);
    this.season = args.season;
    this.contactEmail = args.contactEmail;
    this.contactId = args.contactId;
    this.eventType = args.eventType ?? EventType.COMPETITION;
    this.type = args.type;
    this.teamMatcher = args.teamMatcher;
    this.state = args.state;
    this.country = args.country;
    this.checkEncounterForFilledIn = args.checkEncounterForFilledIn;
    this.exceptions = args?.exceptions?.map((e) => new Exception(e));
    this.infoEvents = args?.infoEvents?.map((e) => new InfoEvent(e));
    this.changeOpenDate = args.changeOpenDate ? new Date(args.changeOpenDate) : undefined;

    this.changeCloseDatePeriod1 = args.changeCloseDatePeriod1
      ? new Date(args.changeCloseDatePeriod1)
      : undefined;
    if (args.changeCloseDatePeriod2) {
      this.changeCloseDatePeriod2 = new Date(args.changeCloseDatePeriod2);
    } else {
      this.changeCloseDatePeriod2 = args.changeCloseDatePeriod1
        ? new Date(args.changeCloseDatePeriod1)
        : undefined;
    }

    this.changeCloseRequestDatePeriod1 = args.changeCloseRequestDatePeriod1
      ? new Date(args.changeCloseRequestDatePeriod1)
      : undefined;

    if (args.changeCloseRequestDatePeriod2) {
      this.changeCloseRequestDatePeriod2 = new Date(args.changeCloseRequestDatePeriod2);
    } else {
      this.changeCloseRequestDatePeriod2 = args.changeCloseRequestDatePeriod1
        ? new Date(args.changeCloseRequestDatePeriod1)
        : undefined;
    }

    this.subEventCompetitions = args?.subEventCompetitions
      ?.map((s) => new SubEventCompetition({ ...s, eventCompetition: this }))
      .sort(sortSubEvents);
    this.comments = args?.comments?.map((c) => new Comment(c));
  }
}
