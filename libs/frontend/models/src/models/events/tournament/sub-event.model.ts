import { GameType } from '@badman/utils';
import { SubEvent } from '../sub-event.model';
import { DrawTournament } from './draw.model';
import { EventTournament } from './event.model';

export class SubEventTournament extends SubEvent {
  eventTournament?: EventTournament;
  gameType?: GameType | string;

  drawTournaments?: DrawTournament[];

  constructor({ ...args }: Partial<SubEventTournament>) {
    super(args);

    this.eventTournament =
      args?.eventTournament != null ? new EventTournament(args.eventTournament) : undefined;
    this.drawTournaments = args?.drawTournaments?.map((d) => new DrawTournament(d));
    this.gameType =
      (args?.gameType ?? null) != null
        ? GameType[args.gameType as keyof typeof GameType]
        : undefined;
  }
}
