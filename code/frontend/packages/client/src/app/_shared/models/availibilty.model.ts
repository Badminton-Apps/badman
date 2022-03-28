import { Location } from './location.model';

export class Availability {
  id?: string;
  year?: number;
  days?: AvailabilityDay[];
  exceptions?: AvailabilityException[];
  location?: Location;

  constructor(args?: Partial<Availability>) {
    this.id = args?.id;
    this.year = args?.year;
    this.days = args?.days;
    this.exceptions = args?.exceptions;
    this.location = args?.location;
  }
}

export interface AvailabilityException {
  start: Date;
  end: Date;
  courts: number;
}

export interface AvailabilityDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;
  endTime: string;
  courts: number;
}
