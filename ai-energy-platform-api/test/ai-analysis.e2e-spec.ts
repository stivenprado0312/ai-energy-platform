import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { PrismaAnomalyRepository } from '../src/modules/analytics/infrastructure/prisma-anomaly.repository';

describe('AI explanation HTTP endpoints (real DB)', () => {
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

  it('POST /anomalies/:id/explanation returns the explanation', async () => {
    const list = await request(app.getHttpServer()).get('/anomalies?meterId=M-109').expect(200);
    const id = list.body[0].id;

    const res = await request(app.getHttpServer())
      .post(`/anomalies/${id}/explanation`)
      .send({})
      .expect(201);

    expect(res.body.anomalyId).toBe(id);
    expect(res.body.anomalyType).toBe('REAL_ANOMALY');
    expect(res.body.severity).toBe('HIGH');
    expect(res.body.summary).toBeDefined();
    expect(res.body.whyItMatters).toBeDefined();
    expect(Array.isArray(res.body.evidence)).toBe(true);
    expect(res.body.recommendation).toBeDefined();
  });

  it('POST /anomalies/:id/explanation returns 404 for a non-existent id', async () => {
    await request(app.getHttpServer())
      .post('/anomalies/non-existent-id/explanation')
      .send({})
      .expect(404);
  });

  it('POST /meters/:meterId/anomalies/explanations generates for all anomalies of the meter', async () => {
    const res = await request(app.getHttpServer())
      .post('/meters/M-104/anomalies/explanations')
      .send({})
      .expect(201);
    expect(res.body.meterId).toBe('M-104');
    expect(res.body.generated).toBe(1);
    expect(res.body.failed).toBe(0);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].anomalyType).toBe('EXPLAINABLE');
  });

  it('POST /meters/M-101/anomalies/explanations returns generated=0 for normal meters', async () => {
    const res = await request(app.getHttpServer())
      .post('/meters/M-101/anomalies/explanations')
      .send({})
      .expect(201);
    expect(res.body.generated).toBe(0);
    expect(res.body.failed).toBe(0);
    expect(res.body.results).toEqual([]);
  });

  it('POST /meters/bad-id/anomalies/explanations returns 400', async () => {
    await request(app.getHttpServer())
      .post('/meters/bad-id/anomalies/explanations')
      .send({})
      .expect(400);
  });

  it('POST /meters/M-999/anomalies/explanations returns 404 for missing meter', async () => {
    await request(app.getHttpServer())
      .post('/meters/M-999/anomalies/explanations')
      .send({})
      .expect(404);
  });

  it('POST /ai/analyze with explain=true runs analysis and generates explanations', async () => {
    await anomalies.deleteAll();
    const res = await request(app.getHttpServer())
      .post('/ai/analyze')
      .send({ explain: true })
      .expect(201);
    expect(res.body.anomalies.length).toBeGreaterThanOrEqual(4);
    expect(res.body.explanationsGenerated).toBe(4);
    // Verify at least one anomaly now has an explanation by fetching detail.
    const detail = await request(app.getHttpServer())
      .get(`/anomalies?meterId=M-109`)
      .expect(200);
    const id = detail.body[0].id;
    const full = await request(app.getHttpServer()).get(`/anomalies/${id}`).expect(200);
    expect(full.body.aiExplanation).not.toBeNull();
    expect(full.body.recommendedAction).not.toBeNull();
  });

  it('POST /ai/analyze without explain=true does not generate explanations', async () => {
    await anomalies.deleteAll();
    const res = await request(app.getHttpServer()).post('/ai/analyze').send({}).expect(201);
    expect(res.body.explanationsGenerated).toBe(0);
  });
});
