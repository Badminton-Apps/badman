import { Event, EventType } from '../event.model';
import { TournamentSubEvent } from './sub-event.model';

export class TournamentEvent extends Event {
  firstDay: Date;
  dates: Date[];
  subEvents: TournamentSubEvent[];
  tournamentNumber: number;

  constructor({ ...args }: Partial<TournamentEvent>) {
    super(args);
    this.firstDay = args.firstDay != null ? new Date(args.firstDay) : null;
    this.dates = ((args.dates as unknown) as string)
      ?.split(',')
      .map((x) => new Date(x));
    this.tournamentNumber = args.tournamentNumber;
    this.eventType = args.eventType ?? EventType.TOURNAMENT;
    this.subEvents = args?.subEvents?.map((s) => new TournamentSubEvent(s));
  }
}
