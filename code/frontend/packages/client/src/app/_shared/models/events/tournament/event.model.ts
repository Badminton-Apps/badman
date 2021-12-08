import { Player } from 'app/_shared';
import { Event, EventType } from '../event.model';
import { TournamentSubEvent } from './sub-event.model';

export class TournamentEvent extends Event {
  firstDay?: Date;
  dates: Date[];
  override subEvents?: TournamentSubEvent[];
  tournamentNumber?: number;

  constructor({ ...args }: Partial<TournamentEvent>) {
    super(args);
    this.firstDay = args?.firstDay != null ? new Date(args.firstDay) : undefined;
    this.dates = (args.dates as unknown as string)?.split(',').map((x) => new Date(x));
    this.tournamentNumber = args.tournamentNumber;
    this.eventType = args.eventType ?? EventType.TOURNAMENT;
    this.subEvents = args?.subEvents
      ?.map((s) => new TournamentSubEvent(s))
      .sort((a, b) => (a?.level ?? 0) - (b?.level ?? 0))
      .sort((a, b) => (a?.eventType ?? 'A').localeCompare(b?.eventType ?? 'A'))
      .sort((a, b) => (a?.gameType ?? 'A').localeCompare(b?.gameType ?? 'A'))
  }
}
