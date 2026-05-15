import {
  ShadowContact,
  ShadowExtraField,
  ShadowMembership,
  ShadowMembershipType,
  ShadowOrganization,
} from "@badman/backend-database";
import { Injectable, Logger } from "@nestjs/common";

/**
 * Truncates all twizzit.shadow_* entity tables.
 * Does NOT touch sync_run or sync_checkpoint history.
 */
@Injectable()
export class TruncateShadowTablesService {
  private readonly logger = new Logger(TruncateShadowTablesService.name);

  async truncate(): Promise<void> {
    this.logger.log("Truncating all twizzit shadow entity tables");

    await ShadowContact.truncate({ cascade: false });
    await ShadowMembership.truncate({ cascade: false });
    await ShadowMembershipType.truncate({ cascade: false });
    await ShadowExtraField.truncate({ cascade: false });
    await ShadowOrganization.truncate({ cascade: false });

    this.logger.log("Shadow entity tables truncated");
  }
}
