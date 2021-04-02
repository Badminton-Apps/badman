import { SubEvent } from '../sub-event.model';
import { TournamentDraw } from './draw.model';
import { TournamentEvent } from './event.model';

export class TournamentSubEvent extends SubEvent {
  event: TournamentEvent;
  draws: TournamentDraw[];

  constructor({ ...args }: Partial<TournamentSubEvent>) {
    super(args);

    this.event = args?.event != null ? new TournamentEvent(args.event) : null;
    this.draws = args?.draws?.map((d) => new TournamentDraw(d));
  }
}
