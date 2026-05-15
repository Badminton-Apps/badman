import {
  ShadowContact,
  ShadowExtraField,
  ShadowMembership,
  ShadowMembershipType,
  ShadowOrganization,
} from "@badman/backend-database";
import type {
  FederationContact,
  FederationExtraField,
  FederationMembership,
  FederationMembershipType,
  FederationOrganization,
} from "@badman/integrations-twizzit-client";
import { Test, TestingModule } from "@nestjs/testing";
import { Transaction } from "sequelize";
import { RecordSkipTracker } from "./record-skip-tracker";
import { ShadowUpsertService } from "./shadow-upsert.service";

const mockTransaction = {} as Transaction;

const mockOrg: FederationOrganization = { id: 42, name: "Test Org" };

const mockContact: FederationContact = {
  id: 1001,
  fullName: "Jan Peeters",
  firstName: "Jan",
  lastName: "Peeters",
  dateOfBirth: "1990-05-15T00:00:00.000Z",
  gender: "M",
  nationality: null,
  language: "nl",
  accountNumber: null,
  registryNumber: null,
  federationNumber: null,
  memberId: "MEM-001",
  hasProfileImage: false,
  address: { street: "", number: "", box: "", postalCode: "", city: "", country: { en: "", nl: "", fr: "" } },
  emails: [],
  mobiles: [],
  home: null,
  extraFields: [],
};

const mockMembership: FederationMembership = {
  id: 5001,
  contactId: 1001,
  membershipTypeId: 10,
  clubId: 20,
  seasonId: 2024,
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  extraFields: [],
};

const mockMembershipType: FederationMembershipType = {
  id: 10,
  name: { en: "Senior", nl: "Senior", fr: "Senior" },
  type: "senior",
  duration: 365,
  durationUnit: "day",
  endDate: null,
  transferDate: null,
};

const mockExtraField: FederationExtraField = {
  id: 7,
  name: { en: "Member ID", nl: "Lid ID", fr: "ID Membre" },
  type: "text",
  location: null,
  options: [],
  attributes: [],
};

describe("ShadowUpsertService", () => {
  let service: ShadowUpsertService;
  let skipTracker: RecordSkipTracker;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShadowUpsertService, RecordSkipTracker],
    }).compile();

    service = module.get(ShadowUpsertService);
    skipTracker = module.get(RecordSkipTracker);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("upsertOrganization", () => {
    it("upsets organization and returns count", async () => {
      jest.spyOn(ShadowOrganization, "bulkCreate").mockResolvedValueOnce([]);
      const written = await service.upsertOrganization([mockOrg], "run-1", mockTransaction);
      expect(written).toBe(1);
      expect(ShadowOrganization.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ twizzitId: 42, name: "Test Org", syncRunId: "run-1" }),
        ]),
        expect.objectContaining({ updateOnDuplicate: expect.any(Array), transaction: mockTransaction })
      );
    });

    it("skips organization with missing id and continues", async () => {
      const invalid = { id: "not-a-number", name: "Bad" } as unknown as FederationOrganization;
      jest.spyOn(ShadowOrganization, "bulkCreate").mockResolvedValueOnce([]);
      const written = await service.upsertOrganization([invalid, mockOrg], "run-1", mockTransaction);
      expect(written).toBe(1);
      expect(skipTracker.count()).toBe(1);
      const skipped = skipTracker.getAll()[0];
      expect(skipped.entityType).toBe("organization");
    });
  });

  describe("upsertExtraField", () => {
    it("upserts extra field", async () => {
      jest.spyOn(ShadowExtraField, "bulkCreate").mockResolvedValueOnce([]);
      const written = await service.upsertExtraField([mockExtraField], "run-1", mockTransaction);
      expect(written).toBe(1);
    });
  });

  describe("upsertMembershipType", () => {
    it("upserts membership type", async () => {
      jest.spyOn(ShadowMembershipType, "bulkCreate").mockResolvedValueOnce([]);
      const written = await service.upsertMembershipType([mockMembershipType], "run-1", mockTransaction);
      expect(written).toBe(1);
    });
  });

  describe("upsertMembership", () => {
    it("upserts membership with all foreign key columns", async () => {
      jest.spyOn(ShadowMembership, "bulkCreate").mockResolvedValueOnce([]);
      const written = await service.upsertMembership([mockMembership], "run-1", mockTransaction);
      expect(written).toBe(1);
      expect(ShadowMembership.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            twizzitId: 5001,
            contactId: 1001,
            clubId: 20,
            membershipTypeId: 10,
            seasonId: 2024,
          }),
        ]),
        expect.any(Object)
      );
    });

    it("skips membership with missing id", async () => {
      const invalid = { ...mockMembership, id: null } as unknown as FederationMembership;
      jest.spyOn(ShadowMembership, "bulkCreate").mockResolvedValueOnce([]);
      skipTracker.reset();
      const written = await service.upsertMembership([invalid], "run-1", mockTransaction);
      expect(written).toBe(0);
      expect(skipTracker.count()).toBe(1);
    });
  });

  describe("upsertContact", () => {
    it("upserts contact with identity columns", async () => {
      jest.spyOn(ShadowContact, "bulkCreate").mockResolvedValueOnce([]);
      const written = await service.upsertContact([mockContact], "run-1", mockTransaction);
      expect(written).toBe(1);
      expect(ShadowContact.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            twizzitId: 1001,
            firstName: "Jan",
            lastName: "Peeters",
            dateOfBirth: "1990-05-15",
            memberId: "MEM-001",
            gender: "M",
          }),
        ]),
        expect.any(Object)
      );
    });

    it("payload round-trip: payload equals the original FederationContact", async () => {
      let capturedRows: unknown[] = [];
      jest.spyOn(ShadowContact, "bulkCreate").mockImplementation(async (rows) => {
        capturedRows = rows as unknown[];
        return [];
      });
      await service.upsertContact([mockContact], "run-1", mockTransaction);
      const row = capturedRows[0] as { payload: unknown };
      expect(row.payload).toEqual(mockContact);
    });

    it("skips contact with null id and continues", async () => {
      const invalid = { ...mockContact, id: null } as unknown as FederationContact;
      jest.spyOn(ShadowContact, "bulkCreate").mockResolvedValueOnce([]);
      skipTracker.reset();
      const written = await service.upsertContact([invalid, mockContact], "run-1", mockTransaction);
      // One valid contact + one skip
      expect(ShadowContact.bulkCreate).toHaveBeenCalledTimes(1);
      expect(written).toBe(1);
      expect(skipTracker.count()).toBe(1);
    });

    it("handles null dateOfBirth gracefully", async () => {
      jest.spyOn(ShadowContact, "bulkCreate").mockResolvedValueOnce([]);
      const withNullDob = { ...mockContact, dateOfBirth: null };
      await service.upsertContact([withNullDob], "run-1", mockTransaction);
      expect(ShadowContact.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ dateOfBirth: null })]),
        expect.any(Object)
      );
    });
  });
});
