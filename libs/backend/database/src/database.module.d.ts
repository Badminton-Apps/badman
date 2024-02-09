import { ConfigType } from '@badman/utils';
import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize-typescript';
export declare class DatabaseModule implements OnModuleInit {
    private readonly configService;
    private readonly sequelize;
    private readonly logger;
    constructor(configService: ConfigService<ConfigType>, sequelize: Sequelize);
    onModuleInit(): Promise<void>;
}
