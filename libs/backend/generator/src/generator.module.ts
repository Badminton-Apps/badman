import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CpDataCollector, PlannerService } from "./services";
import { EnrollmentModule } from "@badman/backend-enrollment";
import { TranslateModule } from "@badman/backend-translate";

@Module({
  imports: [EnrollmentModule, ConfigModule, TranslateModule],
  controllers: [],
  providers: [CpDataCollector, PlannerService],
  exports: [CpDataCollector, PlannerService],
})
export class GeneratorModule {}
