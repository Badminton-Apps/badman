import { Entry } from '../entry.model';

export class Draw {
  id?: string;
  name?: string;
  type?: string;
  size?: number;
  eventEntries: Entry[];

  constructor(args: Partial<Draw>) {
    this.id = args?.id;
    this.name = args?.name;
    this.type = args?.type;
    this.size = args?.size;
    this.eventEntries = args?.eventEntries?.map((e) => new Entry(e)) ?? [];
  }
}
