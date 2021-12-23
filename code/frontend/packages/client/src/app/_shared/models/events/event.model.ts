import { Player, SubEvent } from 'app/_shared';

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

  subEvents?: SubEvent[];

  constructor({ ...args }: Partial<Event>) {
    this.name = args.name;
    this.id = args.id;
    this.slug = args.slug;
    this.fileName = args.fileName;
    this.uniCode = args.uniCode;
    this.allowEnlisting = args.allowEnlisting;
    this.updatedAt = args.updatedAt;
    this.players = args?.players?.map((p) => new Player(p));
  }
}

export enum EventType {
  COMPETITION = 'COMPETITION',
  COMPETITION_CP = 'COMPETITION_CP',
  COMPETITION_XML = 'COMPETITION_XML',
  TOURNAMENT = 'TOURNAMENT',
}
