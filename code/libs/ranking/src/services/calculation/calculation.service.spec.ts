import { DatabaseModule } from '@badman/api/database';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaceService } from '../place';
import { PointsService } from '../points';
import { CalculationService } from './calculation.service';

describe('CalculationService', () => {
  let service: CalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [CalculationService, PointsService, PlaceService],
    }).compile();

    service = module.get<CalculationService>(CalculationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
