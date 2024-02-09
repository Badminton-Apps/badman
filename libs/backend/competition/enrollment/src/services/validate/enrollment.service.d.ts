import { EntryCompetitionPlayer, SubEventCompetition, Team } from '@badman/backend-database';
import { EnrollmentOutput, EnrollmentValidationData } from '../../models';
import { Rule } from './rules';
export declare class EnrollmentValidationService {
    private readonly _logger;
    getValidationData({ systemId, teams, season, }: EnrollmentInput): Promise<EnrollmentValidationData>;
    /**
     * Validate the enrollment
     *
     * @param enrollment Enrollment configuaration
     * @returns Whether the enrollment is valid or not
     */
    validate(enrollment: EnrollmentValidationData, validators: Rule[]): Promise<EnrollmentOutput>;
    fetchAndValidate(data: EnrollmentInput, validators: Rule[]): Promise<EnrollmentOutput>;
    static defaultValidators(): Rule[];
    private getPlayers;
}
declare class EnrollmentInput {
    teams?: EnrollmentInputTeam[];
    systemId?: string;
    season?: number;
}
declare const EnrollmentInputTeam_base: import("@nestjs/common").Type<Partial<Pick<Team, "type" | "name" | "link" | "id" | "teamNumber">>>;
declare class EnrollmentInputTeam extends EnrollmentInputTeam_base {
    basePlayers?: (string | EntryCompetitionPlayer)[];
    players?: (string | EntryCompetitionPlayer)[];
    backupPlayers?: (string | EntryCompetitionPlayer)[];
    subEventId?: string | SubEventCompetition;
}
export {};
