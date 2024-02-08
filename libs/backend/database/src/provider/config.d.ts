import { ConfigService } from '@nestjs/config';
import { SequelizeModuleOptions, SequelizeOptionsFactory } from '@nestjs/sequelize';
import { ConfigType } from '@badman/utils';
export declare class SequelizeConfigProvider implements SequelizeOptionsFactory {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService<ConfigType>);
    createSequelizeOptions(): Promise<SequelizeModuleOptions>;
}
