import { CompetitionSubEvent, SubEvent, TournamentSubEvent } from './sub-event.model';
import { Team } from './team.model';
export class Event {
  id: string;
  name: string;
  type: EventType;
  subEvents: SubEvent[];
  fileName: string;
  uniCode: string;
  allowEnlisting: boolean;

  constructor({ ...args }) {
    this.name = args.name;
    this.id = args.id;
    this.type = args.type;
    this.subEvents = args.subEvents;
    this.fileName = args.fileName;
    this.uniCode = args.uniCode;
    this.allowEnlisting = args.allowEnlisting;
  }
}

export class CompetitionEvent extends Event {
  startYear: number;
  constructor({ ...args }: Partial<CompetitionEvent>) {
    super(args);
    this.startYear = args.startYear;
    this.type = args.type ?? EventType.COMPETITION
    this.subEvents = args?.subEvents?.map((s) => new CompetitionSubEvent(s));
  }
}

export class TournamentEvent extends Event {
  firstDay: Date;
  dates: Date[];
  toernamentNumber: number;

  constructor({ ...args }: Partial<TournamentEvent>) {
    super(args);
    this.firstDay = args.firstDay != null ? new Date(args.firstDay) : null;
    this.dates = ((args.dates as unknown) as string)
      ?.split(',')
      .map((x) => new Date(x));
    this.toernamentNumber = args.toernamentNumber;
    this.type = args.type ?? EventType.TOERNAMENT
    this.subEvents = args?.subEvents?.map((s) => new TournamentSubEvent(s));
  }
}

export enum EventType {
  COMPETITION = 'COMPETITION',
  COMPETITION_CP = 'COMPETITION_CP',
  COMPETITION_XML = 'COMPETITION_XML',
  TOERNAMENT = 'TOERNAMENT',
}
