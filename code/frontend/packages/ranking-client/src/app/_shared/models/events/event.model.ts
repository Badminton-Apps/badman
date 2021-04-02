export class Event {
  id: string;
  name: string;
  eventType: EventType;
  fileName: string;
  uniCode: string;
  type: string
  allowEnlisting: boolean;

  constructor({ ...args }: Partial<Event>) {
    this.name = args.name;
    this.id = args.id;
    this.fileName = args.fileName;
    this.uniCode = args.uniCode;
    this.type = args.type;
    this.allowEnlisting = args.allowEnlisting;
  }
}

export enum EventType {
  COMPETITION = 'COMPETITION',
  COMPETITION_CP = 'COMPETITION_CP',
  COMPETITION_XML = 'COMPETITION_XML',
  TOURNAMENT = 'TOURNAMENT',
}
