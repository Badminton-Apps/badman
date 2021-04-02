import { SubEvent } from './sub-event.model';
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
  }
}

export enum EventType {
  COMPETITION_CP = 'COMPETITION_CP',
  COMPETITION_XML = 'COMPETITION_XML',
  TOERNAMENT = 'TOERNAMENT',
}
