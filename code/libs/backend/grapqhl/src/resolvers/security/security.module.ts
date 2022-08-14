import { DatabaseModule } from '@badman/backend/database';
import { Module } from '@nestjs/common';
import { ClaimResolver } from './claim.resolver';
import { RoleResolver } from './role.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [ClaimResolver, RoleResolver],
})
export class SecurityModule {}
