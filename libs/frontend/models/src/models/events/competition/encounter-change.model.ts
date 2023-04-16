import { Comment } from '../../comment.model';
import { EncounterChangeDate } from './encounter-change-date.model';
import { EncounterCompetition } from './encounter.model';

export class EncounterChange {
  id?: string;
  dates?: EncounterChangeDate[];
  accepted?: boolean;

  homeComments?: Comment[];
  awayComments?: Comment[];

  encounter?: EncounterCompetition;

  constructor(args?: Partial<EncounterChange>) {
    this.id = args?.id;
    this.dates = args?.dates?.map((d) => new EncounterChangeDate(d)) ?? [];
    this.accepted = args?.accepted;

    this.homeComments = args?.homeComments?.map((c) => new Comment(c)) ?? [];
    this.awayComments = args?.awayComments?.map((c) => new Comment(c)) ?? [];
  }
}
