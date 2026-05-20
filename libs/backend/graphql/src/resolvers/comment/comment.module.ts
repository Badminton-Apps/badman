import { DatabaseModule } from "@badman/backend-database";
import { NotificationsModule } from "@badman/backend-notifications";
import { Module } from "@nestjs/common";
import { PlayerLoaderService } from "../../loaders";
import { CommentResolver } from "./comment.resolver";

@Module({
  imports: [NotificationsModule, DatabaseModule],
  providers: [CommentResolver, PlayerLoaderService],
})
export class CommentResolverModule {}
