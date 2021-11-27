import { Team } from './team.model';
import { Player } from './player.model';
import { Role } from './security';
import { Location } from './location.model';

export class Club {
  id?: string;
  name?: string;
  fullName?: string;
  abbreviation?: string;
  useForTeamName?: UseForTeamName;
  clubId?: string;

  teams?: Team[];
  players?: Player[];
  roles?: Role[];
  locations?: Location[];

  constructor({ ...args }: Partial<Club>) {
    this.id = args.id;
    this.name = args.name;
    this.fullName = args.fullName;
    this.abbreviation = args.abbreviation;
    this.useForTeamName = args.useForTeamName;
    this.clubId = args.clubId;
    this.teams = args.teams?.map((t) => new Team(t));
    this.players = args.players?.map((p) => new Player(p));
    this.roles = args.roles?.map((p) => new Role(p));
    this.locations = args.locations?.map((p) => new Location(p));
  }
}

export enum UseForTeamName {
  NAME = 'name',
  FULL_NAME = 'fullName',
  ABBREVIATION = 'abbreviation',
}
