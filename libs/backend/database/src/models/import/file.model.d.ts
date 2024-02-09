import { BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { EventImportType } from '@badman/utils';
export declare class ImporterFile extends Model {
    constructor(values?: Partial<ImporterFile>, options?: BuildOptions);
    id: string;
    name?: string;
    type?: EventImportType;
    firstDay?: Date;
    fileLocation?: string;
    dates?: string;
    linkCode?: string;
    visualCode?: string;
    importing?: boolean;
    tournamentNumber?: number;
}
