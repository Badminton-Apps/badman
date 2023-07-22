import { Location } from './location.model';

export class Availability {
  id?: string;
  season?: number;
  days: AvailabilityDay[];
  exceptions: Exception[];
  location?: Location;
  locationId?: string;

  constructor(args?: Partial<Availability>) {
    this.id = args?.id;
    this.season = args?.season;
    this.days = args?.days?.map((d) => new AvailabilityDay(d)) || [];
    this.exceptions =
      args?.exceptions?.map((e) => new Exception(e)) || [];
    this.location = args?.location;
    this.locationId = args?.locationId;
  }
}

export class Exception {
  start?: Date;
  end?: Date;
  courts?: number;

  constructor(args?: Partial<Exception>) {
    this.start = args?.start ? new Date(args.start) : undefined;
    this.end = args?.end ? new Date(args.end) : undefined;
    this.courts = args?.courts;
  }
}

export class InfoEvent {
  start?: Date;
  end?: Date;
  name?: string;

  constructor(args?: Partial<InfoEvent>) {
    this.start = args?.start ? new Date(args.start) : undefined;
    this.end = args?.end ? new Date(args.end) : undefined;
    this.name = args?.name;
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
