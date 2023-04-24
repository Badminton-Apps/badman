import { Player } from './player.model';

export class Comment {
  id?: string;
  message?: string;
  player?: Player;
  playerId?: string;
  clubId?: string;
  linkId?: string;
  linkType?: string;
  createdAt?: Date;

  constructor(args: Partial<Comment>) {
    this.id = args?.id;
    this.message = args?.message ?? '';
    this.player = args?.player != null ? new Player(args?.player) : undefined;
    this.playerId = args?.playerId;
    this.clubId = args?.clubId;
    this.linkId = args?.linkId;
    this.linkType = args?.linkType;
    this.createdAt = args?.createdAt;
  }
}
