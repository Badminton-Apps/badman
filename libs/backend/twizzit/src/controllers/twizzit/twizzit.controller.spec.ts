import { Test, TestingModule } from '@nestjs/testing';
import { GameExportService } from '../../services';
import { TwizzitController } from './twizzit.controller';

describe('TwizzitController', () => {
  let controller: TwizzitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwizzitController],
      providers: [GameExportService],
    }).compile();

    controller = module.get<TwizzitController>(TwizzitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
