import { Test, TestingModule } from '@nestjs/testing';
import { IncorrectEncountersService } from './incorrect-changed-encounters.service';

describe('IncorrectEncountersService', () => {
  let service: IncorrectEncountersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IncorrectEncountersService],
    }).compile();

    service = module.get<IncorrectEncountersService>(IncorrectEncountersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
