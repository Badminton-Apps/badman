import { Test, TestingModule } from '@nestjs/testing';
import { HandlebarService } from './handlebar.service';

describe('HandlebarService', () => {
  let service: HandlebarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HandlebarService],
    }).compile();

    service = module.get<HandlebarService>(HandlebarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
