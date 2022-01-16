import { AuthenticatedRequest, Club, DataBaseHandler, Player, Role } from '@badvlasim/shared';
import { addPlayerToRoleMutation } from '../../graphql';

describe('calendar changes', () => {
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

  it('Should add player to club when added to role', async () => {
    // ArrangeO
    const club1 = await new Club({ name: 'Awesome Club1' }).save();
    const role = await new Role({ name: 'Awesome Role1' }).save();
    await club1.addRole(role);

    const player = await new Player({
      lastName: 'Player1',
      firstName: 'Awesome',
      memberId: '123456789'
    }).save();

    // Act
    await addPlayerToRoleMutation.resolve(
      null,
      {
        roleId: role.id,
        playerId: player.id
      },
      {
        req: {
          user: {
            hasAnyPermission: () => true
          }
        } as unknown as AuthenticatedRequest
      }
    );

    // Assert
    const resultClubs = await player.getClubs();
    expect(resultClubs.length).toBe(1);
    expect(resultClubs[0].id).toBe(club1.id);
  });

  it("Shouldn't re-add player to club when added to role", async () => {
    // ArrangeO
    const club = await new Club({ name: 'Awesome Club1' }).save();
    const role = await new Role({ name: 'Awesome Role1' }).save();
    const player = await new Player({
      lastName: 'Player1',
      firstName: 'Awesome',
      memberId: '123456789'
    }).save();

    await club.addRole(role);
    await club.addPlayer(player.id, {
      through: {
        start: new Date()
      }
    });

    // Act
    await addPlayerToRoleMutation.resolve(
      null,
      {
        roleId: role.id,
        playerId: player.id
      },
      {
        req: {
          user: {
            hasAnyPermission: () => true
          }
        } as unknown as AuthenticatedRequest
      }
    );

    // Assert
    const resultClubs = await player.getClubs();
    expect(resultClubs.length).toBe(1);
    expect(resultClubs[0].id).toBe(club.id);
  });

  it('Should throw error with insuffisent permissions', async () => {
    // ArrangeO
    const club = await new Club({ name: 'Awesome Club1' }).save();
    const role = await new Role({ name: 'Awesome Role1' }).save();
    await club.addRole(role);

    const player = await new Player({
      lastName: 'Player1',
      firstName: 'Awesome',
      memberId: '123456789'
    }).save();

    // Act
    try {
      await addPlayerToRoleMutation.resolve(
        null,
        {
          roleId: role.id,
          playerId: player.id
        },
        {
          req: {
            user: {
              hasAnyPermission: () => false
            }
          } as unknown as AuthenticatedRequest
        }
      );
    } catch (e) {
      // Assert
      expect(e.message).toBe("You don't have permission to do this");
    }
  });

  it('Should throw error when not logged in', async () => {
    // ArrangeO
    const club = await new Club({ name: 'Awesome Club1' }).save();
    const role = await new Role({ name: 'Awesome Role1' }).save();
    await club.addRole(role);

    const player = await new Player({
      lastName: 'Player1',
      firstName: 'Awesome',
      memberId: '123456789'
    }).save();

    // Act
    try {
      await addPlayerToRoleMutation.resolve(
        null,
        {
          roleId: role.id,
          playerId: player.id
        },
        {
          req: {} as unknown as AuthenticatedRequest
        }
      );
    } catch (e) {
      // Assert
      expect(e.message).toBe("Not authenticated");
    }
  });

  it('Player not found', async () => {
    // ArrangeO
    const club = await new Club({ name: 'Awesome Club1' }).save();
    const role = await new Role({ name: 'Awesome Role1' }).save();
    await club.addRole(role);

    // Act
    try {
      await addPlayerToRoleMutation.resolve(
        null,
        {
          roleId: role.id,
          playerId: ''
        },
        {
          req: {
            user: {
              hasAnyPermission: () => true
            }
          } as unknown as AuthenticatedRequest
        }
      );
    } catch (e) {
      // Assert
      expect(e.message).toBe('Player not found');
    }
  });

  it('Role not found', async () => {
    // ArrangeO

    const player = await new Player({
      lastName: 'Player1',
      firstName: 'Awesome',
      memberId: '123456789'
    }).save();
    // Act
    try {
      await addPlayerToRoleMutation.resolve(
        null,
        {
          roleId: '',
          playerId: player.id
        },
        {
          req: {
            user: {
              hasAnyPermission: () => true
            }
          } as unknown as AuthenticatedRequest
        }
      );
    } catch (e) {
      // Assert
      expect(e.message).toBe('Role not found');
    }
  });
});
