import { TournamentEvent } from 'app/_shared';
import { CompetitionEvent } from './events';
import { Availibility } from './availibilty.model';

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
  competitionEvents?: CompetitionEvent[]
  eventTournements?: TournamentEvent[]
  availibilities?: Availibility[];
  courts?: number;


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
    this.competitionEvents = args?.competitionEvents?.map(r => new CompetitionEvent(r));
    this.eventTournements = args?.eventTournements?.map(r => new TournamentEvent(r));
    this.availibilities = args?.availibilities?.map(r => new Availibility(r));
    this.courts = args?.courts;
  }
}
