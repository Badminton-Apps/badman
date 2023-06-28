import { EnrollmentValidationService } from '@badman/backend-enrollment';
import { I18nTranslations } from '@badman/utils';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
export declare class CpGeneratorService {
    private _configService;
    private _validation;
    private readonly i18nService;
    private readonly logger;
    private connection;
    private stages;
    constructor(_configService: ConfigService, _validation: EnrollmentValidationService, i18nService: I18nService<I18nTranslations>);
    generateCpFile(eventId: string): Promise<string>;
    private _prepCPfile;
    private _addEvents;
    private _addClubs;
    private _addLocations;
    private _addTeams;
    private _addPlayers;
    private _addEntries;
    private _addMemos;
    private _sqlEscaped;
    private _getDayOfWeek;
    private _getGender;
}
