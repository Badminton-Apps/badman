import { DatabaseModule } from "@badman/backend-database";
import { Module } from "@nestjs/common";
import { SettingResolver } from "./setting.resolver";

@Module({
  imports: [DatabaseModule],
  providers: [SettingResolver],
})
export class SettingResolverModule {}
