import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthModule } from '../health.module';

describe('HealthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });
  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  it('/health (GET)', (done) => {
    request(app.getHttpServer())
      .get('/health')
      .expect(503)
      .expect({
        status: 'error',
        info: {},
        error: {
          database: {
            status: 'down',
            message: 'Connection provider not found in application context',
          },
        },
        details: {
          database: {
            status: 'down',
            message: 'Connection provider not found in application context',
          },
        },
      })
      .end(function (err) {
        if (err) return done(err);
        return done();
      });
  });
});
