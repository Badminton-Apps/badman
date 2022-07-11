import { Entry } from '../entry.model';
import { Player } from '../player.model';

export class Event {
  id?: string;
  slug?: string;
  name?: string;
  eventType?: EventType;
  fileName?: string;
  uniCode?: string;
  allowEnlisting?: boolean;
  updatedAt?: Date;
  players?: Player[];

  usedRankingUnit?: 'days' | 'weeks' | 'months';
  usedRankingAmount?: number;

  eventEntries?: Entry[];

  constructor({ ...args }: Partial<Event>) {
    this.name = args.name;
    this.id = args.id;
    this.slug = args.slug;
    this.fileName = args.fileName;
    this.uniCode = args.uniCode;
    this.allowEnlisting = args.allowEnlisting;
    this.updatedAt = args.updatedAt;
    this.players = args?.players?.map((p) => new Player(p));
    this.eventEntries = args?.eventEntries?.map((p) => new Entry(p));

    this.usedRankingUnit = args.usedRankingUnit;
    this.usedRankingAmount = args.usedRankingAmount;
  }
}

export enum EventType {
  COMPETITION = 'COMPETITION',
  COMPETITION_CP = 'COMPETITION_CP',
  COMPETITION_XML = 'COMPETITION_XML',
  TOURNAMENT = 'TOURNAMENT',
}
