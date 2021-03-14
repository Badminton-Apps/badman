import { Claim, Club, DataBaseHandler, Player, Role } from '@badvlasim/shared';

describe('Security', () => {
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

  it('Should create permissions', async () => {
    // arrange
    const player1 = await new Player({
      firstName: 'TestPlayer 1'
    }).save();
    const player2 = await new Player({
      firstName: 'TestPlayer 2'
    }).save();
    const club1 = await new Club({
      name: 'TestClub 1'
    }).save();
    const claim = await new Claim({ name: 'read:club' }).save();
    const role = await new Role({ name: 'admin' }).save();

    // Act
    await role.setClub(club1);

    // Assert
    expect(role.id).not.toBeNull();
    expect(claim.id).not.toBeNull();
  });

  it('Should give permissions', async () => {
    // arrange
    const player1 = await new Player({
      firstName: 'TestPlayer 1'
    }).save();
    const club1 = await new Club({
      name: 'TestClub 1'
    }).save();

    const claim1 = await new Claim({ name: 'claim:1' }).save();
    const claim2 = await new Claim({ name: 'claim:2' }).save();
    const claim3 = await new Claim({ name: 'claim:3' }).save();
    const role = await new Role({ name: 'admin' }).save();

    // Act
    await role.setClaims([claim1, claim2]);
    await role.setClub(club1);
    await claim3.addPlayer(player1);

    // Assert
    const claims = await player1.getUserClaims();

    expect(claims.length).toEqual(1);
    expect(claims).toContain('claim:3');
  });

  it('Should give permissions for club', async () => {
    // arrange
    const player1 = await new Player({
      firstName: 'TestPlayer 1'
    }).save();

    const club1 = await new Club({
      name: 'TestClub 1'
    }).save();

    const club2 = await new Club({
      name: 'TestClub 2'
    }).save();

    const claim1 = await new Claim({ name: 'claim:1' }).save();
    const claim2 = await new Claim({ name: 'claim:2' }).save();
    const claim3 = await new Claim({ name: 'claim:3' }).save();
    const role = await new Role({ name: 'admin' }).save();

    // Act
    await role.setClaims([claim1, claim2]);
    await role.setClub(club1);
    await player1.addRole(role);

    // Assert
    const claims = await player1.getUserClaims();

    expect(claims.length).toEqual(2);
    expect(claims).toContain(`${club1.id}_claim:1`);
    expect(claims).toContain(`${club1.id}_claim:2`);
  });

  it("Shouldn't give permissions for other club", async () => {
    // arrange
    const player1 = await new Player({
      firstName: 'TestPlayer 1'
    }).save();

    const club1 = await new Club({
      name: 'TestClub 1'
    }).save();

    const club2 = await new Club({
      name: 'TestClub 2'
    }).save();

    const claim1 = await new Claim({ name: 'claim:1' }).save();
    const claim2 = await new Claim({ name: 'claim:2' }).save();
    const claim3 = await new Claim({ name: 'claim:3' }).save();
    const role = await new Role({ name: 'admin' }).save();

    // Act
    await role.setClaims([claim1, claim2]);
    await role.setClub(club1);
    await player1.addRole(role);

    // Assert
    const claims = await player1.getUserClaims();

    expect(claims.length).toEqual(2);
  });

  it('Should give permissions for club and normal', async () => {
    // arrange
    const player1 = await new Player({
      firstName: 'TestPlayer 1'
    }).save();

    const club1 = await new Club({
      name: 'TestClub 1'
    }).save();

    const club2 = await new Club({
      name: 'TestClub 2'
    }).save();

    const claim1 = await new Claim({ name: 'claim:1' }).save();
    const claim2 = await new Claim({ name: 'claim:2' }).save();
    const claim3 = await new Claim({ name: 'claim:3' }).save();
    const role = await new Role({ name: 'admin' }).save();

    // Act
    await role.setClaims([claim1, claim2]);
    await role.setClub(club1);
    await player1.addRole(role);
    await player1.addClaim(claim3);

    // Assert
    const claims = await player1.getUserClaims();

    expect(claims.length).toEqual(3);
    expect(claims).toContain(`${club1.id}_claim:1`);
    expect(claims).toContain(`${club1.id}_claim:2`);
    expect(claims).toContain('claim:3');
  });
});
