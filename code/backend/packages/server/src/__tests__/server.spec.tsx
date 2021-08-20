import { Club, DataBaseHandler, EncounterChange, EncounterCompetition, SubEventType, Team } from '@badvlasim/shared';

describe('calendar changes', () => {
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

  it('Requests a calendar change', async () => {
    // Arrange
    const club1 = await new Club({name: 'Awesome Club1'}).save();
    const club2 = await new Club({name: 'Awesome Club2'}).save();
    const myEncounter = await new EncounterCompetition({
      date: new Date('2021-01-01')
    }).save();
    const team1 = await new Team({
      teamNumber: 1,
      type: SubEventType.M,
      clubId: club1.id
    }).save();

    const team2 = await new Team({
      teamNumber: 1,
      type: SubEventType.M,
      clubId: club2.id
    }).save();
    await myEncounter.setHome(team1);
    await myEncounter.setAway(team2);

    // Act
    const changeRequest = await new EncounterChange().save();
    await myEncounter.setEncounterChange(changeRequest);

    // Assert
    const team = await Team.findOne({ where: { name: 'Awesome Club1 1H' } });
    expect(team).not.toBeNull();

    const encountersA = await team.getAwayEncounters();
    const encountersH = await team.getHomeEncounters();

    expect(encountersH.length).toEqual(1);
    expect(encountersA.length).toEqual(0);

    const changes = await encountersH[0].getEncounterChange();
    expect(changes).not.toBeNull();
  });
});
