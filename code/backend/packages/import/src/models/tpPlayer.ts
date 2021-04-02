import { Player } from '@badvlasim/shared';

export class TpPlayer {
  player: Player;
  playerId: string;

  constructor(init?: Partial<TpPlayer>) {
    Object.assign(this, init);
  }

  toJSON() {
    return {
      player: this.player.toJSON(),
      meta: {
        player: this.playerId
      }
    };
  }
}
