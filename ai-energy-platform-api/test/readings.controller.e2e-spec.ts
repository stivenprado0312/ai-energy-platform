import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter';

describe('ReadingsController (HTTP, real DB)', () => {
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

  it('GET /meters/M-109/readings returns 336 readings ordered by timestamp', async () => {
    const res = await request(app.getHttpServer())
      .get('/meters/M-109/readings')
      .expect(200);
    expect(res.body).toHaveLength(336);
    const timestamps = res.body.map((r: { timestamp: string }) => r.timestamp);
    const sorted = [...timestamps].sort();
    expect(timestamps).toEqual(sorted);
  });

  it('GET /meters/M-109/readings respects the limit query parameter', async () => {
    const res = await request(app.getHttpServer())
      .get('/meters/M-109/readings?limit=5')
      .expect(200);
    expect(res.body).toHaveLength(5);
  });

  it('GET /meters/M-109/readings supports the from/to range query', async () => {
    const res = await request(app.getHttpServer())
      .get('/meters/M-109/readings?from=2026-09-12T00:00:00.000Z&to=2026-09-12T23:59:59.000Z')
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.length).toBeLessThanOrEqual(24);
    for (const r of res.body) {
      const ts = new Date(r.timestamp).getTime();
      expect(ts).toBeGreaterThanOrEqual(new Date('2026-09-12T00:00:00.000Z').getTime());
      expect(ts).toBeLessThanOrEqual(new Date('2026-09-12T23:59:59.000Z').getTime());
    }
  });

  it('GET /meters/M-999/readings returns 404', async () => {
    await request(app.getHttpServer()).get('/meters/M-999/readings').expect(404);
  });

  it('GET /meters/M-109/readings?limit=5000 returns at most 5000 rows', async () => {
    const res = await request(app.getHttpServer())
      .get('/meters/M-109/readings?limit=5000')
      .expect(200);
    expect(res.body.length).toBeLessThanOrEqual(5000);
  });

  it('GET /meters/M-109/readings?limit=6000 is rejected by the validator', async () => {
    await request(app.getHttpServer())
      .get('/meters/M-109/readings?limit=6000')
      .expect(400);
  });

  it('GET /meters/M-109/readings?limit=0 returns 400', async () => {
    await request(app.getHttpServer())
      .get('/meters/M-109/readings?limit=0')
      .expect(400);
  });
});
