import { Game } from '../../game.model';
import { CompetitionDraw } from './draw.model';

export class EncounterChangeDate {
  id?: string;
  date?: Date;
  availabilityHome?: Availability;
  availabilityAway?: Availability;
  selected?: boolean;

  constructor(args?: Partial<EncounterChangeDate>) {
    this.id = args?.id;
    this.date = args?.date != null ? new Date(args.date) : undefined;
    this.availabilityHome = args?.availabilityHome;
    this.availabilityAway = args?.availabilityAway;
    this.selected = args?.selected;
  }
}

export enum Availability {
  POSSIBLE = 'POSSIBLE',
  NOT_POSSIBLE = 'NOT_POSSIBLE',
}
