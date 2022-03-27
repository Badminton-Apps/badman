import { Location } from './location.model';

export class Availibility {
  id?: string;
  year?: number;
  days?: AvailiblyDay[];
  exceptions?: AvailabilityException[];
  location?: Location;

  constructor(args?: Partial<Availibility>) {
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

export interface AvailiblyDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;
  endTime: string;
  courts: number;
}
