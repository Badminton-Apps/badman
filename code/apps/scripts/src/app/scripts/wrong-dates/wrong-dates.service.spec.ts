import { Test, TestingModule } from '@nestjs/testing';
import { WrongDatesService } from './wrong-dates.service';
import { VisualModule } from '@badman/backend/visual';

describe('WrongDatesService', () => {
  let service: WrongDatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [VisualModule],
      providers: [WrongDatesService],
    }).compile();

    service = module.get<WrongDatesService>(WrongDatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
