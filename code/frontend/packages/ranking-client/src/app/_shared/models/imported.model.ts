import { Event, EventType } from './event.model';
import { ImporterSubEvent } from './imported-sub-event.model';
export class Imported {
  name: string;
  id: string;
  type: EventType;
  dates: Date[];
  datesString: string;
  firstDay: Date;
  fileName: string;
  importing: boolean;
  subEvents: ImporterSubEvent[]

  uniCode: string;
  toernamentNumber: number;

  suggestions: Event[];
  event: Event;

  constructor({ ...args }) {
    this.name = args.name;
    this.id = args.id;
    this.type = args.type;
    this.dates = args.dates?.split(',').map((x) => new Date(x));
    this.firstDay = args.firstDay != null ? new Date(args.firstDay) : null;
    this.datesString = args.dates;
    this.fileName = args.fileName;
    this.uniCode = args.uniCode;
    this.toernamentNumber = args.toernamentNumber;
    this.importing = args.importing;
    this.subEvents = args.subEvents != null ? args.subEvents.map(r => new ImporterSubEvent(r)) : []
  }
}
