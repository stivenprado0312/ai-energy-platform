import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter';

describe('MetersController (HTTP, real DB)', () => {
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

  it('GET /meters returns 12 meters', async () => {
    const res = await request(app.getHttpServer()).get('/meters').expect(200);
    expect(res.body).toHaveLength(12);
    expect(res.body.map((m: { code: string }) => m.code)).toEqual(
      Array.from({ length: 12 }, (_, i) => `M-${String(101 + i).padStart(3, '0')}`),
    );
  });

  it('GET /meters/M-109 returns the meter detail with summary and events count', async () => {
    const res = await request(app.getHttpServer()).get('/meters/M-109').expect(200);
    expect(res.body.code).toBe('M-109');
    expect(res.body.summary.readingsCount).toBe(336);
    expect(res.body.summary.totalKwh).toBeGreaterThan(0);
    expect(res.body.summary.firstTimestamp).not.toBeNull();
    expect(res.body.summary.lastTimestamp).not.toBeNull();
    expect(res.body.eventsCount).toBe(1);
  });

  it('GET /meters/M-999 returns 404 with a stable error envelope', async () => {
    const res = await request(app.getHttpServer()).get('/meters/M-999').expect(404);
    expect(res.body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('GET /meters/bad-id returns 400 for malformed input', async () => {
    const res = await request(app.getHttpServer()).get('/meters/bad-id').expect(400);
    expect(res.body.statusCode).toBe(400);
  });
});
