import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BrowserCleanupService } from "./cleanup.service";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [],
  providers: [BrowserCleanupService],
  exports: [BrowserCleanupService],
})
export class PupeteerModule {}
