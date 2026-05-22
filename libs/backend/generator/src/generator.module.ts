import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PlannerService } from "./services";
import { EnrollmentModule } from "@badman/backend-enrollment";
import { TranslateModule } from "@badman/backend-translate";

@Module({
  imports: [EnrollmentModule, ConfigModule, TranslateModule],
  controllers: [],
  providers: [PlannerService],
  exports: [PlannerService],
})
export class GeneratorModule {}
