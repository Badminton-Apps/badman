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
import { LevelType, SubEventTypeEnum } from '@badman/utils';
import { EncounterValidationService } from './encounter.service';

describe('EncounterValidationService', () => {
  let service: EncounterValidationService;
  let draw: DrawCompetition;
  let event: EventCompetition;
  let subEvent: SubEventCompetition;
  let encounter: EncounterCompetition;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [EncounterValidationService],
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
        DatabaseModule,
      ],
    }).compile();

    service = module.get<EncounterValidationService>(EncounterValidationService);

    // Setup db
    const sequelize = module.get<Sequelize>(Sequelize);
    await sequelize.sync({ force: true });

    const drawBuilder = DrawCompetitionBuilder.Create().WithName('Test draw');

    const subEventBuilder = SubEventCompetitionBuilder.Create(SubEventTypeEnum.MX, 'Test SubEvent')
      .WithIndex(53, 70)
      .WitnMaxLevel(6);

    const encounterBuilder = EncounterCompetitionBuilder.Create();

    event = await EventCompetitionBuilder.Create(LevelType.PROV)
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
