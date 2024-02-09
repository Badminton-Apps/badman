import { QueueName, Simulation, Sync } from '@badman/backend-queue';
import { Model } from 'sequelize-typescript';
export declare class CronJob extends Model {
    id: string;
    name: string;
    type: 'ranking' | 'sync';
    cronTime: string;
    meta?: CronJobMeta;
    lastRun?: Date;
    running?: boolean;
    amount?: number;
}
declare const CronJobUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<CronJob, "createdAt" | "updatedAt">>>;
export declare class CronJobUpdateInput extends CronJobUpdateInput_base {
}
declare const CronJobNewInput_base: import("@nestjs/common").Type<Partial<Omit<CronJobUpdateInput, "id">>>;
export declare class CronJobNewInput extends CronJobNewInput_base {
}
export type CronJobMeta = QueueCronJob;
export interface QueueCronJob {
    jobName: Sync | Simulation;
    queueName: QueueName;
    arguments: string;
}
export {};
