import { Model } from 'sequelize-typescript';
import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin } from 'sequelize';
import { Player } from './player.model';
import { Relation } from '../wrapper';
export declare class RequestLink extends Model {
    id: string;
    sub?: string;
    player?: Relation<Player>;
    playerId?: string;
    getPlayer: BelongsToGetAssociationMixin<Player>;
    setPlayer: BelongsToSetAssociationMixin<Player, string>;
}
