import { DatabaseModule } from "@badman/backend-database";
import { QueueModule } from "@badman/backend-queue";
import { Module } from "@nestjs/common";
import { QueueResolver } from "./queue.resolver";

@Module({
  imports: [DatabaseModule, QueueModule],
  providers: [QueueResolver],
})
export class QueueResolverModule {}
