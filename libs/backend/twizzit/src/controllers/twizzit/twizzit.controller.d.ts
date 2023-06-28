import { GameExportService } from '../../services';
import { FastifyReply } from 'fastify';
export declare class TwizzitController {
    private readonly _export;
    private readonly logger;
    constructor(_export: GameExportService);
    getTwizzitGames(response: FastifyReply, query: {
        year: number;
        clubId: string;
    }): Promise<void>;
}
