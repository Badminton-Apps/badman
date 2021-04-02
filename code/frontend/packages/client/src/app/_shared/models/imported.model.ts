import { CompetitionEvent, EventType, TournamentEvent } from './events';
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
  tournamentNumber: number;

  suggestions: (TournamentEvent | CompetitionEvent)[];
  event: (TournamentEvent | CompetitionEvent);

  constructor({ ...args }) {
    this.name = args.name;
    this.id = args.id;
    this.type = args.type;
    this.dates = args.dates?.split(',').map((x) => new Date(x));
    this.firstDay = args.firstDay != null ? new Date(args.firstDay) : null;
    this.datesString = args.dates;
    this.fileName = args.fileName;
    this.uniCode = args.uniCode;
    this.tournamentNumber = args.tournamentNumber;
    this.importing = args.importing;
    this.subEvents = args.subEvents?.map(r => new ImporterSubEvent(r)) ?? []
  }
}
