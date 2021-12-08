import { DataBaseHandler } from '@badvlasim/shared';

describe('game point updates', () => {
  beforeAll(async () => {
    new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });
  });

  beforeEach(async () => {
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  it('should update game points', async () => {
    // TODO DEFINE TEST

    // Arrange
    expect(true).toBe(true);

    // Act

    // Assert

  });

  // it('should update games for subevent', async () => {
  //   const group = SystemGroupBuilder.Create();

  //   const system = await SystemBuilder.Create(RankingSystems.VISUAL, 12, 75, 50)
  //     .AsPrimary()
  //     .WithGroup(group)
  //     .Build();
  // });
});
