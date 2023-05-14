import { Player } from '../player.model';
import { Claim } from './claim.model';

export class Role {
  id?: string;
  name?: string;
  description?: string;
  locked?: boolean;
  claims?: Claim[];
  players?: Player[];

  constructor({ ...args }: Partial<Role>) {
    this.id = args.id;
    this.name = args.name;
    this.description = args.description;
    this.locked = args.locked;
    this.claims = args.claims?.map((c) => new Claim(c));
    this.players = args.players?.map((p) => new Player(p));
  }
}
