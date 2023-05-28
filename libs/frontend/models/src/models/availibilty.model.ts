import { Location } from './location.model';

export class Availability {
  id?: string;
  season?: number;
  days: AvailabilityDay[];
  exceptions: AvailabilityException[];
  location?: Location;
  locationId?: string;

  constructor(args?: Partial<Availability>) {
    this.id = args?.id;
    this.season = args?.season;
    this.days = args?.days?.map((d) => new AvailabilityDay(d)) || [];
    this.exceptions =
      args?.exceptions?.map((e) => new AvailabilityException(e)) || [];
    this.location = args?.location;
    this.locationId = args?.locationId;
  }
}

export class AvailabilityException {
  start?: Date;
  end?: Date;
  courts?: number;

  constructor(args?: Partial<AvailabilityException>) {
    this.start = args?.start ? new Date(args.start) : undefined;
    this.end = args?.end ? new Date(args.end) : undefined;
    this.courts = args?.courts;
  }
}

export class AvailabilityDay {
  
  day?:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';
  startTime?: string;
  endTime?: string;
  courts?: number;

  constructor(args?: Partial<AvailabilityDay>) {
    this.day = args?.day;
    this.startTime = args?.startTime;
    this.endTime = args?.endTime;
    this.courts = args?.courts;
  }
}
