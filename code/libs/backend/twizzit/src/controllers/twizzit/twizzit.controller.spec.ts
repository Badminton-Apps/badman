import { Test, TestingModule } from '@nestjs/testing';
import { TwizzitController } from './twizzit.controller';

describe('TwizzitController', () => {
  let controller: TwizzitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwizzitController],
    }).compile();

    controller = module.get<TwizzitController>(TwizzitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
