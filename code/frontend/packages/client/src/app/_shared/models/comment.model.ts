import { Player } from 'app/_shared';
export class Comment {
  id: string;
  message: string;
  player: Player;
  clubId: string;

  constructor({ ...args }: Partial<Comment>) {
    this.id = args?.id;
    this.message = args?.message ?? '';
    this.player = args?.player != null ? new Player(args?.player) : null;
    this.clubId = args?.clubId;
  }
}
