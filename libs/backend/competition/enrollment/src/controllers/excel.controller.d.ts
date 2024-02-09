import { FastifyReply } from 'fastify';
import { ExcelService } from '../services/excel.services';
export declare class EnrollemntController {
    private readonly excelService;
    private readonly logger;
    constructor(excelService: ExcelService);
    getBaseplayersEnrollment(res: FastifyReply, query: {
        eventId: string;
    }): Promise<void>;
}
