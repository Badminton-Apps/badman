import {
  ShadowContact,
  ShadowExtraField,
  ShadowMembership,
  ShadowMembershipType,
  ShadowOrganization,
} from "@badman/backend-database";
import {
  FederationContact,
  FederationExtraField,
  FederationMembership,
  FederationMembershipType,
  FederationOrganization,
} from "@badman/integrations-twizzit-client";
import { Injectable, Logger } from "@nestjs/common";
import { Transaction } from "sequelize";
import { RecordSkipTracker } from "./record-skip-tracker";

function toNumber(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/**
 * Low-level upsert helpers for each Twizzit shadow entity type.
 * Uses Sequelize bulkCreate + updateOnDuplicate for idempotent, per-page writes.
 */
@Injectable()
export class ShadowUpsertService {
  private readonly logger = new Logger(ShadowUpsertService.name);

  constructor(private readonly skipTracker: RecordSkipTracker) {}

  async upsertOrganization(
    orgs: FederationOrganization[],
    syncRunId: string,
    transaction: Transaction
  ): Promise<number> {
    let written = 0;
    const rows: (typeof ShadowOrganization.prototype._creationAttributes)[] = [];

    for (const org of orgs) {
      const id = toNumber(org.id);
      if (id === null) {
        this.skipTracker.record({
          entityType: "organization",
          twizzitId: org.id,
          reason: "missing or non-numeric twizzit_id",
        });
        this.logger.warn("Skipping organization with invalid id", { id: org.id });
        continue;
      }
      rows.push({
        twizzitId: id,
        name: org.name ?? null,
        payload: org as unknown as object,
        syncRunId,
        fetchedAt: new Date(),
      });
    }

    if (rows.length > 0) {
      await ShadowOrganization.bulkCreate(rows as never[], {
        updateOnDuplicate: ["name", "payload", "syncRunId", "fetchedAt"],
        transaction,
      });
      written = rows.length;
    }

    return written;
  }

  async upsertExtraField(
    fields: FederationExtraField[],
    syncRunId: string,
    transaction: Transaction
  ): Promise<number> {
    let written = 0;
    const rows: (typeof ShadowExtraField.prototype._creationAttributes)[] = [];

    for (const field of fields) {
      const id = toNumber(field.id);
      if (id === null) {
        this.skipTracker.record({
          entityType: "extra_field",
          twizzitId: field.id,
          reason: "missing or non-numeric twizzit_id",
        });
        this.logger.warn("Skipping extra_field with invalid id", { id: field.id });
        continue;
      }
      rows.push({
        twizzitId: id,
        payload: field as unknown as object,
        syncRunId,
        fetchedAt: new Date(),
      });
    }

    if (rows.length > 0) {
      await ShadowExtraField.bulkCreate(rows as never[], {
        updateOnDuplicate: ["payload", "syncRunId", "fetchedAt"],
        transaction,
      });
      written = rows.length;
    }

    return written;
  }

  async upsertMembershipType(
    types: FederationMembershipType[],
    syncRunId: string,
    transaction: Transaction
  ): Promise<number> {
    let written = 0;
    const rows: (typeof ShadowMembershipType.prototype._creationAttributes)[] = [];

    for (const mt of types) {
      const id = toNumber(mt.id);
      if (id === null) {
        this.skipTracker.record({
          entityType: "membership_type",
          twizzitId: mt.id,
          reason: "missing or non-numeric twizzit_id",
        });
        this.logger.warn("Skipping membership_type with invalid id", { id: mt.id });
        continue;
      }
      rows.push({
        twizzitId: id,
        payload: mt as unknown as object,
        syncRunId,
        fetchedAt: new Date(),
      });
    }

    if (rows.length > 0) {
      await ShadowMembershipType.bulkCreate(rows as never[], {
        updateOnDuplicate: ["payload", "syncRunId", "fetchedAt"],
        transaction,
      });
      written = rows.length;
    }

    return written;
  }

  async upsertMembership(
    memberships: FederationMembership[],
    syncRunId: string,
    transaction: Transaction
  ): Promise<number> {
    let written = 0;
    const validRows: (typeof ShadowMembership.prototype._creationAttributes)[] = [];

    for (const m of memberships) {
      const id = toNumber(m.id);
      if (id === null) {
        this.skipTracker.record({
          entityType: "membership",
          twizzitId: m.id,
          reason: "missing or non-numeric twizzit_id",
        });
        this.logger.warn("Skipping membership with invalid id", { id: m.id });
        continue;
      }
      validRows.push({
        twizzitId: id,
        contactId: toNumber(m.contactId),
        clubId: toNumber(m.clubId),
        membershipTypeId: toNumber(m.membershipTypeId),
        seasonId: toNumber(m.seasonId),
        startDate: m.startDate ?? null,
        endDate: m.endDate ?? null,
        payload: m as unknown as object,
        syncRunId,
        fetchedAt: new Date(),
      });
    }

    if (validRows.length > 0) {
      await ShadowMembership.bulkCreate(validRows as never[], {
        updateOnDuplicate: [
          "contactId",
          "clubId",
          "membershipTypeId",
          "seasonId",
          "startDate",
          "endDate",
          "payload",
          "syncRunId",
          "fetchedAt",
        ],
        transaction,
      });
      written = validRows.length;
    }

    return written;
  }

  async upsertContact(
    contacts: FederationContact[],
    syncRunId: string,
    transaction: Transaction
  ): Promise<number> {
    let written = 0;
    const validRows: (typeof ShadowContact.prototype._creationAttributes)[] = [];

    for (const c of contacts) {
      const id = toNumber(c.id);
      if (id === null) {
        this.skipTracker.record({
          entityType: "contact",
          twizzitId: c.id,
          reason: "missing or non-numeric twizzit_id",
        });
        this.logger.warn("Skipping contact with invalid id", { id: c.id });
        continue;
      }

      let dateOfBirth: string | null = null;
      if (c.dateOfBirth) {
        const parsed = c.dateOfBirth.slice(0, 10);
        dateOfBirth = parsed.length === 10 ? parsed : null;
      }

      validRows.push({
        twizzitId: id,
        firstName: c.firstName ?? null,
        lastName: c.lastName ?? null,
        dateOfBirth,
        memberId: c.memberId ?? null,
        gender: c.gender ?? null,
        payload: c as unknown as object,
        syncRunId,
        fetchedAt: new Date(),
      });
    }

    if (validRows.length > 0) {
      await ShadowContact.bulkCreate(validRows as never[], {
        updateOnDuplicate: [
          "firstName",
          "lastName",
          "dateOfBirth",
          "memberId",
          "gender",
          "payload",
          "syncRunId",
          "fetchedAt",
        ],
        transaction,
      });
      written = validRows.length;
    }

    return written;
  }
}
