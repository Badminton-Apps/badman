import { GameType } from '../../game.model';
import { SubEvent } from '../sub-event.model';
import { TournamentDraw } from './draw.model';
import { EventTournament } from './event.model';

export class TournamentSubEvent extends SubEvent {
  eventTournament?: EventTournament;
  gameType?: GameType | string;

  drawTournaments?: TournamentDraw[];

  constructor({ ...args }: Partial<TournamentSubEvent>) {
    super(args);

    this.eventTournament =
      args?.eventTournament != null
        ? new EventTournament(args.eventTournament)
        : undefined;
    this.drawTournaments = args?.drawTournaments?.map(
      (d) => new TournamentDraw(d)
    );
    this.gameType =
      (args?.gameType ?? null) != null
        ? (<any>GameType)[args.gameType ?? '']
        : undefined;
  }
}
