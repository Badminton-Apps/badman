import { GameType } from '../../game.model';
import { SubEvent } from '../sub-event.model';
import { TournamentDraw } from './draw.model';
import { EventTournament } from './event.model';

export class TournamentSubEvent extends SubEvent {
  event?: EventTournament;
  gameType?: GameType | string;

  constructor({ ...args }: Partial<TournamentSubEvent>) {
    super(args);

    this.event =
      args?.event != null ? new EventTournament(args.event) : undefined;
    this.draws = args?.draws?.map((d) => new TournamentDraw(d));
    this.gameType =
      (args?.gameType ?? null) != null
        ? (<any>GameType)[args.gameType ?? '']
        : undefined;
  }
}
