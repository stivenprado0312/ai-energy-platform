import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter';

describe('DashboardController (HTTP, real DB)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /dashboard/summary returns the expected Phase 1 shape', async () => {
    const res = await request(app.getHttpServer()).get('/dashboard/summary').expect(200);
    expect(res.body).toMatchObject({
      totalMeters: 12,
      totalAnomalies: 0,
      highPriorityAnomalies: 0,
      analysisStatus: 'PENDING_PHASE_2',
    });
    expect(typeof res.body.totalConsumptionKwh).toBe('number');
    expect(res.body.totalConsumptionKwh).toBeGreaterThan(0);
    expect(res.body.lastReadingAt).not.toBeNull();
    expect(res.body.periodStart).not.toBeNull();
    expect(res.body.periodEnd).not.toBeNull();
  });
});
