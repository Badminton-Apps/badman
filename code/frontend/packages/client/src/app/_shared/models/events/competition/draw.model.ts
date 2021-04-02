import { CompetitionSubEvent } from '../competition';
import { Draw } from '../draw.model';
import { CompetitionEncounter } from './encounter.model';

export class CompetitionDraw extends Draw {
  subEvent: CompetitionSubEvent;

  encounters: CompetitionEncounter[];

  constructor(args: Partial<CompetitionDraw>) {
    super(args);
    this.subEvent = args?.subEvent
      ? new CompetitionSubEvent(args.subEvent)
      : null;
    this.encounters = args?.encounters?.map((e) => new CompetitionEncounter(e));
  }
}
