import { DataBaseHandler, Player } from '@badvlasim/shared';
import { SearchController } from '../controllers';
import { getMockReq, getMockRes } from '@jest-mock/express';
import { Router } from 'express';

jest.mock('sequelize', () => {
  const originalModule = jest.requireActual('sequelize');

  //Mock i like to be like, sqlite doesn't support this
  return {
    ...originalModule,
    Op: {
      ...originalModule.Op,
      iLike: originalModule.Op.like
    }
  };
});

describe('Search', () => {
  let controller: SearchController;

  beforeAll(async () => {
    new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });
  });

  beforeEach(async () => {
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
    // Create a new controller
    controller = new SearchController(Router(), []);
  });

  it('Search endpoint should return players', async () => {
    // Arrange
    await Player.bulkCreate([
      {
        firstName: 'John',
        lastName: 'Doe',
        memberId: '123456789',
        gender: 'M'
      },
      {
        firstName: 'Jane',
        lastName: 'Doe',
        memberId: '987',
        gender: 'F'
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        memberId: '654',
        gender: 'M'
      }
    ]);

    const req = getMockReq({
      query: {
        query: 'John'
      }
    });
    const { res } = getMockRes();

    // Act
    await controller['_search'](req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          memberId: '123456789'
        }),
        expect.objectContaining({
          memberId: '654'
        })
      ])
    );
  });

  describe('Throw error when no or empty query is defined', () => {
    test.each([
      { name: 'Empty', query: '' },
      { name: 'space', query: ' ' },
    ])('$name', async ({ query }) => {
      // Arrange
      const req = getMockReq({
        query: {
          query
        }
      });
      const { res } = getMockRes();

      // Act
      await controller['_search'](req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: 'No query provided' });
    });
  });
});
