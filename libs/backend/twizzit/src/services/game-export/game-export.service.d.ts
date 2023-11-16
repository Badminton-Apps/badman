import { EncounterCompetition } from '@badman/backend-database';
export declare class GameExportService {
    private readonly logger;
    getGames(year: number, clubId: string): Promise<EncounterCompetition[]>;
    gamesExport(year: number, clubId: string): Promise<{
        'Game id': string;
        Type: string;
        Seizoen: string;
        Datum: string;
        'Start tijdstip': string;
        'Eind tijdstip': string;
        'Tijdstip afspraak': string;
        Thuisteam: string;
        Uitteam: string;
        Resource: string;
        'Part (%)': string;
        Omschrijving: string;
        Score: string;
        'Score details': string;
    }[]>;
}
