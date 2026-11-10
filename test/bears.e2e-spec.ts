import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp, resetDatabase } from './utils/test-app';

interface ColorBody {
  id: string;
  name: string;
}

interface BearBody {
  id: string;
  name: string;
  size: number;
  colors: ColorBody[];
}

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('Bears (e2e)', () => {
  let app: INestApplication<App>;

  const http = () => request(app.getHttpServer());

  async function createColor(name: string): Promise<ColorBody> {
    const res = await http().post('/colors').send({ name }).expect(201);
    return res.body as ColorBody;
  }

  async function createBear(
    name: string,
    size: number,
    colors: ColorBody[] = [],
  ): Promise<BearBody> {
    const created = await http()
      .post('/bears')
      .send({ name, size })
      .expect(201);
    const bear = created.body as BearBody;
    if (colors.length === 0) {
      return bear;
    }
    const updated = await http()
      .put('/bears')
      .send({ id: bear.id, colors: colors.map(({ id }) => ({ id })) })
      .expect(200);
    return updated.body as BearBody;
  }

  const names = (bears: BearBody[]) => bears.map((bear) => bear.name);
  const colorNames = (bear: BearBody) =>
    bear.colors.map((color) => color.name).sort();

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => resetDatabase(app));

  afterAll(() => app.close());

  describe('POST /bears', () => {
    it('creates a bear without colors', async () => {
      const res = await http()
        .post('/bears')
        .send({ name: 'Baloo', size: 10 })
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(String) as string,
        name: 'Baloo',
        size: 10,
        colors: [],
      });
    });

    it.each([
      ['a negative size', { name: 'Baloo', size: -1 }],
      ['a non-integer size', { name: 'Baloo', size: 1.5 }],
      ['a missing name', { size: 10 }],
    ])('returns 400 for %s', (_case, body) => {
      return http().post('/bears').send(body).expect(400);
    });
  });

  describe('GET /bears', () => {
    it('returns all bears with their colors', async () => {
      const brown = await createColor('brown');
      await createBear('Baloo', 10, [brown]);
      await createBear('Polar', 25);

      const res = await http().get('/bears').expect(200);
      const bears = res.body as BearBody[];

      expect(names(bears)).toEqual(['Baloo', 'Polar']);
      expect(colorNames(bears[0])).toEqual(['brown']);
      expect(bears[1].colors).toEqual([]);
    });
  });

  describe('PUT /bears', () => {
    it('updates only the fields that are sent', async () => {
      const brown = await createColor('brown');
      const bear = await createBear('Baloo', 10, [brown]);

      const res = await http()
        .put('/bears')
        .send({ id: bear.id, size: 12 })
        .expect(200);

      expect(res.body).toMatchObject({ name: 'Baloo', size: 12 });
      expect(colorNames(res.body as BearBody)).toEqual(['brown']);
    });

    it('replaces the colors, accepting full color objects', async () => {
      const brown = await createColor('brown');
      const white = await createColor('white');
      const black = await createColor('black');
      const bear = await createBear('Baloo', 10, [brown]);

      const res = await http()
        .put('/bears')
        .send({ id: bear.id, colors: [white, black] })
        .expect(200);

      expect(colorNames(res.body as BearBody)).toEqual(['black', 'white']);

      const list = await http().get('/bears').expect(200);
      expect(colorNames((list.body as BearBody[])[0])).toEqual([
        'black',
        'white',
      ]);
    });

    it('removes all colors with an empty list', async () => {
      const brown = await createColor('brown');
      const bear = await createBear('Baloo', 10, [brown]);

      const res = await http()
        .put('/bears')
        .send({ id: bear.id, colors: [] })
        .expect(200);

      expect((res.body as BearBody).colors).toEqual([]);
    });

    it('returns 404 for an unknown bear', () => {
      return http().put('/bears').send({ id: UNKNOWN_ID, size: 3 }).expect(404);
    });

    it('returns 404 for an unknown color and leaves the bear unchanged', async () => {
      const brown = await createColor('brown');
      const bear = await createBear('Baloo', 10, [brown]);

      const res = await http()
        .put('/bears')
        .send({ id: bear.id, colors: [{ id: UNKNOWN_ID }] })
        .expect(404);

      expect((res.body as { message: string }).message).toBe(
        `Colors not found: ${UNKNOWN_ID}`,
      );
      const list = await http().get('/bears').expect(200);
      expect(colorNames((list.body as BearBody[])[0])).toEqual(['brown']);
    });

    it('returns 400 for an invalid id', () => {
      return http().put('/bears').send({ id: 'not-a-uuid' }).expect(400);
    });
  });

  describe('DELETE /bears/:bearId', () => {
    it('deletes the bear and its color links', async () => {
      const brown = await createColor('brown');
      const bear = await createBear('Baloo', 10, [brown]);

      await http().delete(`/bears/${bear.id}`).expect(204);

      await http().get('/bears').expect(200, []);
      const links: unknown[] = await app
        .get(DataSource)
        .query('SELECT * FROM bear_colors');
      expect(links).toEqual([]);
      await http().get('/colors').expect(200, [brown]);
    });

    it('returns 404 for an unknown bear', () => {
      return http().delete(`/bears/${UNKNOWN_ID}`).expect(404);
    });

    it('returns 400 for an invalid id', () => {
      return http().delete('/bears/not-a-uuid').expect(400);
    });
  });

  describe('GET /bears/:minimumSize/:maximumSize', () => {
    beforeEach(async () => {
      await createBear('Small', 5);
      await createBear('Medium', 10);
      await createBear('Large', 20);
    });

    it('returns bears within the boundaries, inclusive', async () => {
      const res = await http().get('/bears/5/10').expect(200);
      expect(names(res.body as BearBody[])).toEqual(['Small', 'Medium']);
    });

    it('returns an empty list when no bear matches', () => {
      return http().get('/bears/30/40').expect(200, []);
    });

    it('returns 400 when the minimum is greater than the maximum', () => {
      return http().get('/bears/20/5').expect(400);
    });

    it('returns 400 for non-numeric boundaries', () => {
      return http().get('/bears/abc/10').expect(400);
    });
  });

  describe('GET /bears/:color', () => {
    it('returns bears with the color, including all their colors', async () => {
      const brown = await createColor('brown');
      const black = await createColor('black');
      const white = await createColor('white');
      await createBear('Baloo', 10, [brown, black]);
      await createBear('Grizzly', 15, [brown]);
      await createBear('Polar', 25, [white]);

      const res = await http().get('/bears/brown').expect(200);
      const bears = res.body as BearBody[];

      expect(names(bears)).toEqual(['Baloo', 'Grizzly']);
      expect(colorNames(bears[0])).toEqual(['black', 'brown']);
    });

    it('ignores the case of the color name', async () => {
      const brown = await createColor('brown');
      await createBear('Baloo', 10, [brown]);

      const res = await http().get('/bears/Brown').expect(200);
      expect(names(res.body as BearBody[])).toEqual(['Baloo']);
    });

    it('returns an empty list for an unknown color', () => {
      return http().get('/bears/purple').expect(200, []);
    });
  });
});
