import { Test, TestingModule } from '@nestjs/testing';
import { PlannerService } from './planner.service';

describe('PlannerService', () => {
  let service: PlannerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlannerService],
    }).compile();

    service = module.get<PlannerService>(PlannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
