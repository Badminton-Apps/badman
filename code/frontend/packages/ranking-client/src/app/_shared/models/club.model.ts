import { Team } from './team.model';
import { Player } from './player.model';

export class Club {
  id: string;
  name: string;
  abbreviation: string;
  clubId: string;

  teams: Team[];
  players: Player[];

  constructor({ ...args }) {
    this.id = args.id;
    this.name = args.name;
    this.abbreviation = args.abbreviation;
    this.clubId = args.clubId;
    this.teams = args.teams?.map((t) => new Team(t));
    this.players = args.players?.map((p) => new Player(p)); 
  }
}
