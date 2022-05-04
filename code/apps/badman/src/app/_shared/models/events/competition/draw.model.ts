import { Entry } from '../../entry.model';
import { CompetitionSubEvent } from '../competition';
import { Draw } from '../draw.model';
import { CompetitionEncounter } from './encounter.model';

export class CompetitionDraw extends Draw {
  subeventId?: string;
  subEvent?: CompetitionSubEvent;

  encounters?: CompetitionEncounter[];


  constructor(args: Partial<CompetitionDraw>) {
    super(args);
    this.subeventId = args?.subeventId;
    this.subEvent = args?.subEvent ? new CompetitionSubEvent(args.subEvent) : undefined;
    this.encounters = args?.encounters?.map((e) => new CompetitionEncounter(e))?.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
  }
}
