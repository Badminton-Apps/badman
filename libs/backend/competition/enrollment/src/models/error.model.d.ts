import { I18nTranslations } from '@badman/utils';
import { PathImpl2 } from '@nestjs/config';
export declare class EnrollmentValidationError {
    message?: PathImpl2<I18nTranslations>;
    params?: unknown;
}
export declare class TeamInfo {
    message?: PathImpl2<I18nTranslations>;
    params?: unknown;
}
export declare class TeamValidity {
    teamId?: string;
    valid?: boolean;
}
