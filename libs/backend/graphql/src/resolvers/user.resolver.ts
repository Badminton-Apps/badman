import { User } from '@badman/backend-authorization';
import { AppUser } from '@badman/models';
import { Logger } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class UserResolver {
  private readonly logger = new Logger(UserResolver.name);

  @Query(() => AppUser, { nullable: true })
  async me(@User() user: AppUser): Promise<AppUser | null> {
    if (user?.id) {
      this.logger.log(`User ${user.id} is requesting their own data from`);

      return user;
    } else {
      return null;
    }
  }
}
