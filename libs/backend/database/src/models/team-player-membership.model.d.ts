import { TeamMembershipType } from '@badman/utils';
import { BuildOptions, SaveOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Relation } from '../wrapper';
export declare class TeamPlayerMembership extends Model {
    constructor(values?: Partial<TeamPlayerMembership>, options?: BuildOptions);
    id: string;
    playerId?: string;
    teamId?: string;
    membershipType?: Relation<TeamMembershipType>;
    end?: Date;
    start?: Date;
    static checkIfPlayerIsInClub(instance: TeamPlayerMembership, options: SaveOptions): Promise<void>;
    static checkIfPlayersIsInClub(instances: TeamPlayerMembership[], options: SaveOptions): Promise<void>;
}
