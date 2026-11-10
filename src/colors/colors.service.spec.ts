import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Color } from './color.entity';
import { ColorsService } from './colors.service';

describe('ColorsService', () => {
  let service: ColorsService;
  let repository: jest.Mocked<
    Pick<Repository<Color>, 'find' | 'create' | 'save'>
  >;

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    repository.create.mockImplementation((data) => data as Color);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ColorsService,
        { provide: getRepositoryToken(Color), useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(ColorsService);
  });

  describe('findAll', () => {
    it('returns all colors ordered by name', async () => {
      const colors = [{ id: '1', name: 'brown' }];
      repository.find.mockResolvedValue(colors);

      await expect(service.findAll()).resolves.toEqual(colors);
      expect(repository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });
  });

  describe('create', () => {
    it('saves and returns the new color', async () => {
      const saved = { id: '1', name: 'brown' };
      repository.save.mockResolvedValue(saved);

      await expect(service.create({ name: 'brown' })).resolves.toEqual(saved);
      expect(repository.save).toHaveBeenCalledWith({ name: 'brown' });
    });

    it('throws ConflictException when the name already exists', async () => {
      const driverError = Object.assign(new Error('duplicate key'), {
        code: '23505',
      });
      repository.save.mockRejectedValue(
        new QueryFailedError('INSERT', [], driverError),
      );

      await expect(service.create({ name: 'brown' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows unexpected errors', async () => {
      const error = new Error('connection lost');
      repository.save.mockRejectedValue(error);

      await expect(service.create({ name: 'brown' })).rejects.toBe(error);
    });
  });
});
