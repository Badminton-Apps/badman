import { Test, TestingModule } from '@nestjs/testing';
import { ChangedEncountersService } from './changed-encounters.service';

describe('ChangedEncountersService', () => {
  let service: ChangedEncountersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ChangedEncountersService],
    }).compile();

    service = module.get<ChangedEncountersService>(ChangedEncountersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
