import { Module, OnModuleInit } from "@nestjs/common";
import { EventEntry } from "@badman/backend-database";
import { EnrollmentValidationService } from "./services";
import { IndexCalculationService } from "./services/index-calculation/index-calculation.service";

@Module({
  controllers: [],
  providers: [EnrollmentValidationService, IndexCalculationService],
  exports: [EnrollmentValidationService, IndexCalculationService],
})
export class EnrollmentModule implements OnModuleInit {
  constructor(private readonly indexCalculationService: IndexCalculationService) {}

  onModuleInit() {
    EventEntry.setIndexCalculationService(this.indexCalculationService);
  }
}
