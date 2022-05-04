import { Entry } from '../entry.model';

export class Draw {
  id?: string;
  name?: string;
  type?: string;
  size?: number;
  entries?: Entry[];

  constructor(args: Partial<Draw>) {
    this.id = args?.id;
    this.name = args?.name;
    this.type = args?.type;
    this.size = args?.size;
    this.entries = args?.entries?.map((e) => new Entry(e));
  }
}
