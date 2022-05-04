import { Comment } from '../../comment.model';
import { EncounterChangeDate } from './encounter-change-date.model';
import { CompetitionEncounter } from './encounter.model';

export class EncounterChange {
  id?: string;
  dates?: EncounterChangeDate[];
  accepted?: boolean;

  homeComment?: Comment;
  awayComment?: Comment;

  encounter?: CompetitionEncounter;

  constructor(args?: Partial<EncounterChange>) {
    this.id = args?.id;
    this.dates = args?.dates?.map((d) => new EncounterChangeDate(d)) ?? [];
    this.accepted = args?.accepted;

    this.homeComment = args?.homeComment != null ? new Comment(args.homeComment) : undefined;
    this.awayComment = args?.awayComment != null ? new Comment(args.awayComment) : undefined;
  }
}
