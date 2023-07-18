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
  official?: boolean;
  updatedAt?: Date;
  lastSync?: Date;
  players?: Player[];

  openDate?: Date;
  closeDate?: Date;



  allowEnlisting?: boolean;

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
    this.updatedAt = args.updatedAt;
    this.lastSync = args.lastSync;
    this.players = args?.players?.map((p) => new Player(p));
    this.eventEntries = args?.eventEntries?.map((p) => new EventEntry(p));

    this.openDate = args.openDate ? new Date(args.openDate) : undefined;
    this.closeDate = args.closeDate ? new Date(args.closeDate) : undefined;

    if (this.openDate && this.closeDate) {
      this.allowEnlisting =
        this.openDate <= new Date() && this.closeDate >= new Date();
    }

    this.usedRankingUnit = args.usedRankingUnit;
    this.usedRankingAmount = args.usedRankingAmount;
  }
}
