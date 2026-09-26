import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { PrismaAnomalyRepository } from '../src/modules/analytics/infrastructure/prisma-anomaly.repository';

describe('Analytics HTTP endpoints (real DB)', () => {
  let app: INestApplication;
  let analytics: AnalyticsService;
  let anomalies: PrismaAnomalyRepository;

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
    analytics = moduleRef.get(AnalyticsService);
    anomalies = moduleRef.get(PrismaAnomalyRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await anomalies.deleteAll();
    await analytics.analyzeAll();
  });

  it('GET /anomalies/summary returns counts after analysis', async () => {
    const res = await request(app.getHttpServer()).get('/anomalies/summary').expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(4);
    expect(res.body.byType.DATA_QUALITY).toBe(1);
    expect(res.body.byType.EXPLAINABLE).toBe(1);
    expect(res.body.byType.FALSE_POSITIVE).toBe(1);
    expect(res.body.byType.REAL_ANOMALY).toBe(1);
    expect(res.body.byPriority.HIGH).toBeGreaterThanOrEqual(2);
  });

  it('GET /anomalies returns the list', async () => {
    const res = await request(app.getHttpServer()).get('/anomalies').expect(200);
    expect(res.body).toHaveLength(4);
    const ids = res.body.map((a: { meterId: string }) => a.meterId);
    expect(ids.sort()).toEqual(['M-104', 'M-106', 'M-109', 'M-112']);
  });

  it('GET /anomalies?type=REAL_ANOMALY filters by type', async () => {
    const res = await request(app.getHttpServer())
      .get('/anomalies?type=REAL_ANOMALY')
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].meterId).toBe('M-109');
  });

  it('GET /anomalies?severity=HIGH filters by severity', async () => {
    const res = await request(app.getHttpServer())
      .get('/anomalies?severity=HIGH')
      .expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /anomalies?type=BAD returns 400', async () => {
    await request(app.getHttpServer()).get('/anomalies?type=BAD').expect(400);
  });

  it('GET /anomalies/M-104 returns 404 for a non-existent id', async () => {
    await request(app.getHttpServer()).get('/anomalies/non-existent').expect(404);
  });

  it('GET /anomalies/:id returns full evidence for an existing anomaly', async () => {
    const list = await request(app.getHttpServer()).get('/anomalies?meterId=M-109').expect(200);
    const id = list.body[0].id;
    const res = await request(app.getHttpServer()).get(`/anomalies/${id}`).expect(200);
    expect(res.body.meterId).toBe('M-109');
    expect(res.body.type).toBe('REAL_ANOMALY');
    expect(res.body.evidence).toBeDefined();
    expect(res.body.evidence.baseline).toBeDefined();
    expect(res.body.evidence.deviation).toBeDefined();
    expect(res.body.evidence.matchedEvent).toBeDefined();
    expect(res.body.evidence.matchedEvent.type).toBe('UNKNOWN');
  });

  it('GET /meters/M-109/anomalies returns anomalies for a specific meter', async () => {
    const res = await request(app.getHttpServer()).get('/meters/M-109/anomalies').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].meterId).toBe('M-109');
  });

  it('GET /meters/M-101/anomalies returns 200 with an empty array', async () => {
    const res = await request(app.getHttpServer()).get('/meters/M-101/anomalies').expect(200);
    expect(res.body).toEqual([]);
  });

  it('GET /meters/bad-id/anomalies returns 400', async () => {
    await request(app.getHttpServer()).get('/meters/bad-id/anomalies').expect(400);
  });

  it('POST /ai/analyze runs the analytics pipeline for one meter', async () => {
    await anomalies.deleteAllForMeter('M-109');
    const res = await request(app.getHttpServer())
      .post('/ai/analyze')
      .send({ meterId: 'M-109' })
      .expect(201);
    expect(res.body.status).toBe('DONE');
    expect(res.body.anomalies).toHaveLength(1);
    expect(res.body.anomalies[0].meterId).toBe('M-109');
    expect(res.body.anomalies[0].type).toBe('REAL_ANOMALY');
  });

  it('POST /ai/analyze runs the analytics pipeline for all meters', async () => {
    await anomalies.deleteAll();
    const res = await request(app.getHttpServer())
      .post('/ai/analyze')
      .send({})
      .expect(201);
    expect(res.body.analyzedMeters).toBe(12);
    expect(res.body.anomalies).toHaveLength(4);
  });
});
