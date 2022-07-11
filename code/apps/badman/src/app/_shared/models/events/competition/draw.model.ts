import { CompetitionSubEvent } from '../competition';
import { Draw } from '../draw.model';
import { CompetitionEncounter } from './encounter.model';

export class CompetitionDraw extends Draw {
  subeventId?: string;
  subEventCompetition?: CompetitionSubEvent;

  encounterCompetitions?: CompetitionEncounter[];

  constructor(args: Partial<CompetitionDraw>) {
    super(args);
    this.subeventId = args?.subeventId;
    this.subEventCompetition = args?.subEventCompetition
      ? new CompetitionSubEvent(args.subEventCompetition)
      : undefined;
    this.encounterCompetitions = args?.encounterCompetitions
      ?.map((e) => new CompetitionEncounter(e))
      ?.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
  }
}
