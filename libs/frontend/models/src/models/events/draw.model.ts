import { DrawType } from '@badman/utils';
import { EventEntry } from '../entry.model';

export class Draw {
  id?: string;
  name?: string;
  type?: DrawType;
  size?: number;
  eventEntries: EventEntry[];
  risers?: number;
  fallers?: number;
  visualCode?: string;

  constructor(args?: Partial<Draw>) {
    this.id = args?.id;
    this.name = args?.name;
    this.type = args?.type;
    this.size = args?.size;
    this.eventEntries = args?.eventEntries?.map((e) => new EventEntry(e)) ?? [];
    this.risers = args?.risers;
    this.fallers = args?.fallers;
    this.visualCode = args?.visualCode;
  }
}
