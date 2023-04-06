import { Test, TestingModule } from '@nestjs/testing';
import { GameExportService } from './game-export.service';

describe('GameExportService', () => {
  let service: GameExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameExportService],
    }).compile();

    service = module.get<GameExportService>(GameExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
