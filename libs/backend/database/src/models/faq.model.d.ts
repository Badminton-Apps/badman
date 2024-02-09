import { BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
export declare class Faq extends Model {
    constructor(values?: Partial<Faq>, options?: BuildOptions);
    id: string;
    question?: string;
    answer?: string;
}
declare const FaqUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<Faq, "createdAt" | "updatedAt">>>;
export declare class FaqUpdateInput extends FaqUpdateInput_base {
}
declare const FaqNewInput_base: import("@nestjs/common").Type<Partial<Omit<FaqUpdateInput, "id">>>;
export declare class FaqNewInput extends FaqNewInput_base {
}
export {};
