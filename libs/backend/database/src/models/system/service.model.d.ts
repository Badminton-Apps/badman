import { Model } from 'sequelize-typescript';
export declare class Service extends Model {
    id: string;
    name: string;
    renderId?: string;
    status: 'starting' | 'started' | 'stopped';
}
declare const ServiceUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<Service, "createdAt" | "updatedAt">>>;
export declare class ServiceUpdateInput extends ServiceUpdateInput_base {
}
declare const ServiceNewInput_base: import("@nestjs/common").Type<Partial<Omit<ServiceUpdateInput, "id">>>;
export declare class ServiceNewInput extends ServiceNewInput_base {
}
export {};
