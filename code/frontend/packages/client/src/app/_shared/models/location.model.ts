import { TournamentEvent } from 'app/_shared';
import { CompetitionEvent } from './events';

export class Location {
  id?: string;
  name?: string;
  address?: string;
  postalcode?: string;
  city?: string;
  state?: string;
  phone?: string;
  fax?: string;
  street?: string;
  streetNumber?: string;
  eventCompetitions?: CompetitionEvent[]
  eventTournements?: TournamentEvent[]
  // courts: Court;

  constructor(args?: Partial<Location>) {
    this.id = args?.id;
    this.name = args?.name;
    this.address = args?.address;
    this.postalcode = args?.postalcode;
    this.city = args?.city;
    this.state = args?.state;
    this.phone = args?.phone;
    this.fax = args?.fax;
    this.street = args?.street;
    this.streetNumber = args?.streetNumber;
    this.eventCompetitions = args?.eventCompetitions?.map(r => new CompetitionEvent(r));
    this.eventTournements = args?.eventTournements?.map(r => new TournamentEvent(r));
  }
}
