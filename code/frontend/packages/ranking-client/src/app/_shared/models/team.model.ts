import { Player } from './player.model';

export class Team {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
  players: Player[];

  baseIndex: number;

  constructor(args: Partial<Team>) {
    this.id = args.id;
    this.name = args.name;
    this.abbreviation = args.abbreviation;
    this.type = args.type;
    this.players = args.players?.map((p) => new Player(p));
    this.baseIndex = args.baseIndex
  }
}
