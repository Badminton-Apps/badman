import { ChangeEncounterAvailability } from '@badman/utils';

export class EncounterChangeDate {
  id?: string;
  date?: Date;
  availabilityHome?: ChangeEncounterAvailability;
  availabilityAway?: ChangeEncounterAvailability;
  selected?: boolean;
  locationId?: string;

  constructor(args?: Partial<EncounterChangeDate>) {
    this.id = args?.id;
    this.date = args?.date != null ? new Date(args.date) : undefined;
    this.availabilityHome = args?.availabilityHome;
    this.availabilityAway = args?.availabilityAway;
    this.selected = args?.selected;
    this.locationId = args?.locationId;
  }
}
