import { EventCompetition } from '@badman/backend-database';
export declare class ExcelService {
    GetEnrollment(eventId: string): Promise<{
        buffer: any;
        event: EventCompetition | null;
    }>;
    private getPlayerEntry;
}
