import { Test, TestingModule } from "@nestjs/testing";
import { Service } from "@badman/backend-database";
import { ServiceResolver } from "./service.resolver";

describe("ServiceResolver", () => {
  let resolver: ServiceResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceResolver],
    }).compile();

    resolver = module.get<ServiceResolver>(ServiceResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("services (query)", () => {
    it("returns list of services", async () => {
      const list = [{ id: "s1" }, { id: "s2" }] as unknown as Service[];
      jest.spyOn(Service, "findAll").mockResolvedValue(list);
      expect(await resolver.services({} as any)).toEqual(list);
    });

    it("returns empty array when no services exist", async () => {
      jest.spyOn(Service, "findAll").mockResolvedValue([]);
      expect(await resolver.services({} as any)).toEqual([]);
    });
  });
});
