import {
  EncounterCompetition,
  EventCompetition,
  EventTournament,
} from '../events';
import { Player } from '../player.model';

export class Notification {
  id?: string;
  sendTo?: Player;
  sendToId?: string;
  type?: string;
  linkId?: string;
  linkType?: string;
  encounter?: EncounterCompetition;
  competition?: EventCompetition;
  tournament?: EventTournament;
  read?: boolean;
  meta?: string;

  constructor({ ...args }: Partial<Notification>) {
    this.id = args?.id;
    this.sendTo = args?.sendTo;
    this.sendToId = args?.sendToId;
    this.type = args?.type;
    this.linkId = args?.linkId;
    this.linkType = args?.linkType;
    this.encounter =
      args?.encounter != null
        ? new EncounterCompetition(args.encounter)
        : undefined;
    this.competition =
      args?.competition != null
        ? new EventCompetition(args.competition)
        : undefined;

    this.tournament =
      args?.tournament != null
        ? new EventTournament(args.tournament)
        : undefined;
    this.read = args?.read;
    this.meta = args?.meta;
  }
}
