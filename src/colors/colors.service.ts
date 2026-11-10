import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Color } from './color.entity';
import { CreateColorDto } from './dto/create-color.dto';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class ColorsService {
  constructor(
    @InjectRepository(Color)
    private readonly colorsRepository: Repository<Color>,
  ) {}

  findAll(): Promise<Color[]> {
    return this.colorsRepository.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateColorDto): Promise<Color> {
    try {
      return await this.colorsRepository.save(
        this.colorsRepository.create({ name: dto.name }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Color "${dto.name}" already exists`);
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
  );
}
