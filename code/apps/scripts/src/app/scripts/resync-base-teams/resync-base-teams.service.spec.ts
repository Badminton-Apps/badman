import { Test, TestingModule } from '@nestjs/testing';
import { ResyncBaseTeamsService } from './resync-base-teams.service';

describe('ResyncBaseTeamsService', () => {
  let service: ResyncBaseTeamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResyncBaseTeamsService],
    }).compile();

    service = module.get<ResyncBaseTeamsService>(ResyncBaseTeamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
