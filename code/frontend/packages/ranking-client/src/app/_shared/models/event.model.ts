import { SubEvent } from './sub-event.model';
import { Team } from './team.model';
export class Event {
  name: string;
  id: string;
  type: EventType;
  dates: Date[];
  firstDay: Date;
  subEvents: SubEvent[];
  fileName: string;
  uniCode: string;
  toernamentNumber: number;

  constructor({ ...args }) {
    this.name = args.name;
    this.id = args.id;
    this.type = args.type;
    this.dates = args.dates?.split(',').map((x) => new Date(x));
    this.firstDay = args.firstDay != null ? new Date(args.firstDay) : null;
    this.subEvents = args.subEvents;
    this.fileName = args.fileName;
    this.uniCode = args.uniCode;
    this.toernamentNumber = args.toernamentNumber;
    this.subEvents = args?.subEvents?.map(s => new SubEvent(s));
  }
}

export enum EventType {
  COMPETITION = 'COMPETITION',
  COMPETITION_CP = 'COMPETITION_CP',
  COMPETITION_XML = 'COMPETITION_XML',
  TOERNAMENT = 'TOERNAMENT',
}
