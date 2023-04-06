import { EventType } from '@badman/utils';
import { EventEntry } from '../entry.model';
import { Player } from '../player.model';

export class Event {
  id?: string;
  slug?: string;
  name?: string;
  eventType?: EventType;
  fileName?: string;
  visualCode?: string;
  allowEnlisting?: boolean;
  official?: boolean;
  updatedAt?: Date;
  lastSync?: Date;
  players?: Player[];

  usedRankingUnit?: 'days' | 'weeks' | 'months';
  usedRankingAmount?: number;

  eventEntries?: EventEntry[];

  constructor({ ...args }: Partial<Event>) {
    this.name = args.name;
    this.id = args.id;
    this.slug = args.slug;
    this.fileName = args.fileName;
    this.official = args?.official;
    this.visualCode = args.visualCode;
    this.allowEnlisting = args.allowEnlisting;
    this.updatedAt = args.updatedAt;
    this.lastSync = args.lastSync;
    this.players = args?.players?.map((p) => new Player(p));
    this.eventEntries = args?.eventEntries?.map((p) => new EventEntry(p));

    this.usedRankingUnit = args.usedRankingUnit;
    this.usedRankingAmount = args.usedRankingAmount;
  }
}

