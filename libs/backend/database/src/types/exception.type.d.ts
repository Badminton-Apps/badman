export declare class ExceptionType {
    start?: Date;
    end?: Date;
    courts?: number;
}
declare const AvailabilityExceptionInputType_base: import("@nestjs/common").Type<Partial<Omit<ExceptionType, never>>>;
export declare class AvailabilityExceptionInputType extends AvailabilityExceptionInputType_base {
}
export declare class InfoEventType {
    start?: Date;
    end?: Date;
    name?: string;
}
declare const InfoEventInputType_base: import("@nestjs/common").Type<Partial<Omit<InfoEventType, never>>>;
export declare class InfoEventInputType extends InfoEventInputType_base {
}
export {};
