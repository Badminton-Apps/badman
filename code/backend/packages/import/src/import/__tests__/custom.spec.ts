import { Club, DataBaseHandler } from '@badvlasim/shared';

describe.skip('custom', () => {
  let databaseService: DataBaseHandler;
  beforeAll(async () => {
    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });
  });

  beforeEach(async () => {
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  it('ignoreduplicates', async () => {
    await new Club({
      name: 'Testing'
    }).save();

    const club2 = new Club({
      name: 'Testing'
    }).toJSON() as any;

    const dbClub = await Club.bulkCreate([club2], {
      ignoreDuplicates: true
    });

    const findCountAll = await Club.findAndCountAll();
    expect(findCountAll.count).toEqual(1);
    expect(dbClub[0].id).toEqual(findCountAll.rows[0].id);
  });

  it('updateOnDuplicate', async () => {
    await new Club({
      name: 'Testing'
    }).save();

    const club2 = new Club({
      name: 'Testing'
    }).toJSON() as any;

    const dbClub = await Club.bulkCreate([club2], {
      updateOnDuplicate: ['name'],
      returning: true
    });

    const findCountAll = await Club.findAndCountAll();
    expect(findCountAll.count).toEqual(1);
    expect(dbClub[0].id).toEqual(findCountAll.rows[0].id);
  });

  it('returning', async () => {
    await new Club({
      name: 'Testing'
    }).save();

    const club2 = new Club({
      name: 'Testing'
    }).toJSON() as any;

    const dbClub = await Club.bulkCreate([club2], {
      ignoreDuplicates: true,
      returning: ['id']
    });

    const findCountAll = await Club.findAndCountAll();
    expect(findCountAll.count).toEqual(1);
    expect(dbClub[0].id).toEqual(findCountAll.rows[0].id);
  });
});
