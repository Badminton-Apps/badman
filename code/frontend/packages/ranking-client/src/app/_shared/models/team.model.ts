import { Player } from "./player.model";

export class Team {
  id: string;
  name: string;
  abbreviation: string;
  players: Player[];

  constructor({ ...args }: Partial<Team>) {
    this.id = args.id;
    this.name = args.name;
    this.abbreviation = args.abbreviation;
    this.players = args.players?.map(p => new Player(p));
  }
}
