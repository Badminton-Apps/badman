import { DatabaseModule } from "@badman/backend-database";
import { Module } from "@nestjs/common";
import { EnrollmentSettingResolver } from "./enrollmentSetting.resolver";

@Module({
  imports: [DatabaseModule],
  providers: [EnrollmentSettingResolver],
})
export class EnrollmentSettingResolverModule {}
