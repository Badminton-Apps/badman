import { Test, TestingModule } from "@nestjs/testing";
import { SearchService } from "./search.service";
import { ConfigModule } from "@nestjs/config";

describe("SearchService", () => {
  let service: SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: ".env.test",
        }),
      ],
      providers: [SearchService],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getParts", () => {
    it("should handle names with special characters", () => {
      const result = service.getParts("Ingūna Čeiko");

      // Should include both original and normalized versions
      expect(result).toContain("ingūna");
      expect(result).toContain("čeiko");
      expect(result).toContain("inguna"); // normalized version
      expect(result).toContain("ceiko"); // normalized version
    });

    it("should handle French names with accents", () => {
      const result = service.getParts("Stéphanie Bauwens");

      expect(result).toContain("stéphanie");
      expect(result).toContain("bauwens");
      expect(result).toContain("stephanie"); // normalized version
    });

    it("should handle empty or undefined input", () => {
      expect(service.getParts("")).toEqual([]);
      expect(service.getParts(null as unknown as string)).toEqual([]);
      expect(service.getParts(undefined as unknown as string)).toEqual([]);
    });

    it("should handle mixed special characters and normal text", () => {
      const result = service.getParts("José María García");

      expect(result).toContain("josé");
      expect(result).toContain("maría");
      expect(result).toContain("garcía");
      expect(result).toContain("jose"); // normalized
      expect(result).toContain("maria"); // normalized
      expect(result).toContain("garcia"); // normalized
    });

    it("should filter out duplicates", () => {
      const result = service.getParts("test test");

      // Should only contain 'test' once, not twice
      expect(result.filter((part) => part === "test")).toHaveLength(1);
    });
  });
});
