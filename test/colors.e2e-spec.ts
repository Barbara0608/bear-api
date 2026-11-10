import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, resetDatabase } from './utils/test-app';

describe('Colors (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => resetDatabase(app));

  afterAll(() => app.close());

  it('GET /colors returns an empty list', () => {
    return request(app.getHttpServer()).get('/colors').expect(200, []);
  });

  it('POST /colors creates a color and trims its name', async () => {
    const res = await request(app.getHttpServer())
      .post('/colors')
      .send({ name: '  brown  ' })
      .expect(201);

    expect(res.body).toEqual({
      id: expect.any(String) as string,
      name: 'brown',
    });

    const list = await request(app.getHttpServer()).get('/colors').expect(200);
    expect(list.body).toEqual([res.body]);
  });

  it('POST /colors returns 409 for a duplicate name', async () => {
    await request(app.getHttpServer())
      .post('/colors')
      .send({ name: 'brown' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/colors')
      .send({ name: 'brown' })
      .expect(409);

    expect((res.body as { message: string }).message).toBe(
      'Color "brown" already exists',
    );
  });

  it.each([
    ['an empty name', { name: '' }],
    ['a missing name', {}],
    ['an unknown field', { name: 'white', extra: true }],
  ])('POST /colors returns 400 for %s', (_case, body) => {
    return request(app.getHttpServer()).post('/colors').send(body).expect(400);
  });
});
