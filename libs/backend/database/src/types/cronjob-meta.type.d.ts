export declare class CronJobMetaType {
    jobName?: string;
    queueName?: string;
    arguments?: string;
}
declare const CronJobMetaInputType_base: import("@nestjs/common").Type<Partial<Omit<CronJobMetaType, never>>>;
export declare class CronJobMetaInputType extends CronJobMetaInputType_base {
}
export {};
