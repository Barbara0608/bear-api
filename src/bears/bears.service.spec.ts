import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Color } from '../colors/color.entity';
import { Bear } from './bear.entity';
import { BearsService } from './bears.service';

const BEAR_ID = '6f1c2a3e-1111-4c1d-9a1b-000000000001';
const BROWN_ID = '6f1c2a3e-2222-4c1d-9a1b-000000000002';
const WHITE_ID = '6f1c2a3e-3333-4c1d-9a1b-000000000003';

const brown: Color = { id: BROWN_ID, name: 'brown' };
const white: Color = { id: WHITE_ID, name: 'white' };

function makeBear(overrides: Partial<Bear> = {}): Bear {
  return {
    id: BEAR_ID,
    name: 'Baloo',
    size: 10,
    colors: [brown],
    ...overrides,
  };
}

describe('BearsService', () => {
  let service: BearsService;
  let bears: jest.Mocked<
    Pick<
      Repository<Bear>,
      'find' | 'findOne' | 'create' | 'save' | 'delete' | 'createQueryBuilder'
    >
  >;
  let colors: jest.Mocked<Pick<Repository<Color>, 'findBy'>>;

  beforeEach(async () => {
    bears = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    bears.create.mockImplementation((data) => data as Bear);
    bears.save.mockImplementation((bear) => Promise.resolve(bear as Bear));
    colors = { findBy: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BearsService,
        { provide: getRepositoryToken(Bear), useValue: bears },
        { provide: getRepositoryToken(Color), useValue: colors },
      ],
    }).compile();

    service = moduleRef.get(BearsService);
  });

  describe('findAll', () => {
    it('returns all bears with their colors', async () => {
      const all = [makeBear()];
      bears.find.mockResolvedValue(all);

      await expect(service.findAll()).resolves.toEqual(all);
      expect(bears.find).toHaveBeenCalledWith({
        relations: { colors: true },
        order: { name: 'ASC' },
      });
    });
  });

  describe('findBySizeRange', () => {
    it('queries bears with size between the boundaries', async () => {
      bears.find.mockResolvedValue([]);

      await service.findBySizeRange(5, 15);

      expect(bears.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { size: Between(5, 15) } }),
      );
    });

    it('rejects a minimum greater than the maximum', () => {
      expect(() => service.findBySizeRange(20, 5)).toThrow(BadRequestException);
      expect(bears.find).not.toHaveBeenCalled();
    });
  });

  describe('findByColor', () => {
    it('filters by color name through a sub-query', async () => {
      const result = [makeBear()];
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(result),
      };
      bears.createQueryBuilder.mockReturnValue(qb as never);

      await expect(service.findByColor('Brown')).resolves.toEqual(result);
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('bear.colors', 'color');
      expect(qb.setParameter).toHaveBeenCalledWith('colorName', 'brown');
    });
  });

  describe('create', () => {
    it('creates a bear with no colors', async () => {
      const created = await service.create({ name: 'Baloo', size: 10 });

      expect(created).toEqual({ name: 'Baloo', size: 10, colors: [] });
      expect(bears.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the bear does not exist', async () => {
      bears.findOne.mockResolvedValue(null);

      await expect(service.update({ id: BEAR_ID, size: 12 })).rejects.toThrow(
        NotFoundException,
      );
      expect(bears.save).not.toHaveBeenCalled();
    });

    it('updates only the given fields and keeps colors when omitted', async () => {
      bears.findOne.mockResolvedValue(makeBear());

      const updated = await service.update({ id: BEAR_ID, size: 12 });

      expect(updated).toEqual(makeBear({ size: 12 }));
      expect(colors.findBy).not.toHaveBeenCalled();
    });

    it('replaces the colors with the given ones', async () => {
      bears.findOne.mockResolvedValue(makeBear());
      colors.findBy.mockResolvedValue([brown, white]);

      const updated = await service.update({
        id: BEAR_ID,
        colors: [{ id: BROWN_ID }, { id: WHITE_ID }, { id: WHITE_ID }],
      });

      expect(colors.findBy).toHaveBeenCalledWith({
        id: In([BROWN_ID, WHITE_ID]),
      });
      expect(updated.colors).toEqual([brown, white]);
    });

    it('removes all colors when given an empty list', async () => {
      bears.findOne.mockResolvedValue(makeBear());

      const updated = await service.update({ id: BEAR_ID, colors: [] });

      expect(updated.colors).toEqual([]);
      expect(colors.findBy).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when a color does not exist', async () => {
      bears.findOne.mockResolvedValue(makeBear());
      colors.findBy.mockResolvedValue([brown]);

      await expect(
        service.update({
          id: BEAR_ID,
          colors: [{ id: BROWN_ID }, { id: WHITE_ID }],
        }),
      ).rejects.toThrow(`Colors not found: ${WHITE_ID}`);
      expect(bears.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the bear', async () => {
      bears.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.remove(BEAR_ID)).resolves.toBeUndefined();
      expect(bears.delete).toHaveBeenCalledWith(BEAR_ID);
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      bears.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.remove(BEAR_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
