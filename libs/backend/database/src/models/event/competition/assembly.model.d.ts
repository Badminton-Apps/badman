import { Model } from 'sequelize-typescript';
import { Player } from '../../player.model';
import { Team } from '../../team.model';
import { EncounterCompetition } from './encounter-competition.model';
import { Relation } from '../../../wrapper';
export declare class Assembly extends Model<Assembly> {
    id: string;
    assembly?: AssemblyData;
    description?: string;
    encounterId?: string;
    encounterCompetition?: Relation<EncounterCompetition>;
    teamId?: string;
    team?: Relation<Team>;
    captainId?: string;
    captain?: Relation<Player>;
    playerId?: string;
    player?: Relation<Player>;
}
export interface AssemblyData {
    single1?: string;
    single2?: string;
    single3?: string;
    single4?: string;
    double1?: string[];
    double2?: string[];
    double3?: string[];
    double4?: string[];
    subtitudes?: string[];
}
