import { EntryCompetitionPlayer, PlayerUpdateInput, RankingSystem, SubEventCompetition, Team } from '@badman/backend-database';
import { EnrollmentValidationError } from './error.model';
export declare class EnrollmentInput {
    teams?: EnrollmentInputTeam[];
    systemId?: string;
    season?: number;
}
declare const EnrollmentInputTeam_base: import("@nestjs/common").Type<Partial<Pick<Team, "type" | "name" | "link" | "id" | "teamNumber">>>;
export declare class EnrollmentInputTeam extends EnrollmentInputTeam_base {
    basePlayers?: string[];
    players?: string[];
    backupPlayers?: string[];
    subEventId?: string;
}
export declare class EnrollmentOutput {
    teams?: TeamEnrollmentOutput[];
}
declare const PlayerRankingType_base: import("@nestjs/common").Type<Partial<Omit<PlayerUpdateInput, "sub" | "permissions">>>;
export declare class PlayerRankingType extends PlayerRankingType_base {
    single?: number;
    double?: number;
    mix?: number;
}
export declare class TeamEnrollmentOutput {
    id: string;
    linkId?: string;
    teamIndex?: number;
    baseIndex?: number;
    isNewTeam?: boolean;
    possibleOldTeam?: boolean;
    maxLevel?: number;
    minBaseIndex?: number;
    maxBaseIndex?: number;
    errors?: EnrollmentValidationError[];
    warnings?: EnrollmentValidationError[];
    valid?: boolean;
}
export type RuleResult = {
    teamId: string;
    warnings?: EnrollmentValidationError[];
    errors?: EnrollmentValidationError[];
    valid: boolean;
};
export declare class EnrollmentValidationData {
    teams: EnrollmentValidationTeam[];
}
export declare class EnrollmentValidationTeam {
    team?: Partial<Team>;
    previousSeasonTeam?: Partial<Team>;
    isNewTeam?: boolean;
    possibleOldTeam?: boolean;
    teamIndex?: number;
    teamPlayers?: EntryCompetitionPlayer[];
    backupPlayers?: EntryCompetitionPlayer[];
    baseIndex?: number;
    basePlayers?: EntryCompetitionPlayer[];
    subEvent?: SubEventCompetition;
    system?: RankingSystem;
}
export {};
