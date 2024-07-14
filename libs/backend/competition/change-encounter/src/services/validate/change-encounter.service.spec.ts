import {
  DatabaseModule,
  DrawCompetition,
  DrawCompetitionBuilder,
  EncounterCompetition,
  EncounterCompetitionBuilder,
  EventCompetition,
  EventCompetitionBuilder,
  SubEventCompetition,
  SubEventCompetitionBuilder,
} from '@badman/backend-database';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import { ChangeEncounterValidationService } from './change-encounter.service';

import { SubEventTypeEnum } from '@badman/utils';

describe('ChangeEncounterValidationService', () => {
  let service: ChangeEncounterValidationService;
  let draw: DrawCompetition;
  let event: EventCompetition;
  let subEvent: SubEventCompetition;
  let encounter: EncounterCompetition;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [ChangeEncounterValidationService],
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
        DatabaseModule,
      ],
    }).compile();

    service = module.get<ChangeEncounterValidationService>(ChangeEncounterValidationService);

    // Setup db
    const sequelize = module.get<Sequelize>(Sequelize);
    await sequelize.sync({ force: true });

    const drawBuilder = DrawCompetitionBuilder.Create().WithName('Test draw');

    const subEventBuilder = SubEventCompetitionBuilder.Create(SubEventTypeEnum.MX)
      .WithName('Test SubEvent')
      .WithIndex(53, 70)
      .WitnMaxLevel(6);

    const encounterBuilder = EncounterCompetitionBuilder.Create();

    event = await EventCompetitionBuilder.Create()
      .WithYear(2020)
      .WithUsedRanking({ amount: 4, unit: 'months' })
      .WithName('Test Event')
      .WithSubEvent(subEventBuilder.WithDraw(drawBuilder.WithEnouncter(encounterBuilder)))
      .Build();

    draw = await drawBuilder.Build();
    subEvent = await subEventBuilder.Build();
    encounter = await encounterBuilder.Build();
  }, 50000);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
