import { SubEventCompetition } from '../competition';
import { Draw } from '../draw.model';
import { EncounterCompetition } from './encounter.model';

export class DrawCompetition extends Draw {
  subeventId?: string;
  subEventCompetition?: SubEventCompetition;

  encounterCompetitions?: EncounterCompetition[];

  constructor(args?: Partial<DrawCompetition>) {
    super(args);
    this.subeventId = args?.subeventId;
    this.subEventCompetition = args?.subEventCompetition
      ? new SubEventCompetition(args.subEventCompetition)
      : undefined;
    this.encounterCompetitions = args?.encounterCompetitions
      ?.map((e) => new EncounterCompetition(e))
      ?.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
  }
}
