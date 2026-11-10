import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Color } from '../colors/color.entity';
import { Bear } from './bear.entity';
import { CreateBearDto } from './dto/create-bear.dto';
import { UpdateBearDto } from './dto/update-bear.dto';

@Injectable()
export class BearsService {
  constructor(
    @InjectRepository(Bear)
    private readonly bearsRepository: Repository<Bear>,
    @InjectRepository(Color)
    private readonly colorsRepository: Repository<Color>,
  ) {}

  findAll(): Promise<Bear[]> {
    return this.bearsRepository.find({
      relations: { colors: true },
      order: { name: 'ASC' },
    });
  }

  findBySizeRange(minimumSize: number, maximumSize: number): Promise<Bear[]> {
    if (minimumSize > maximumSize) {
      throw new BadRequestException(
        'minimumSize must be less than or equal to maximumSize',
      );
    }
    return this.bearsRepository.find({
      where: { size: Between(minimumSize, maximumSize) },
      relations: { colors: true },
      order: { size: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Bears that have the given color, returned with all of their colors.
   * Color names are stored in lowercase, so the search is case-insensitive.
   */
  findByColor(colorName: string): Promise<Bear[]> {
    return this.bearsRepository
      .createQueryBuilder('bear')
      .leftJoinAndSelect('bear.colors', 'color')
      .where((qb) => {
        const bearsWithColor = qb
          .subQuery()
          .select('b.id')
          .from(Bear, 'b')
          .innerJoin('b.colors', 'c')
          .where('c.name = :colorName')
          .getQuery();
        return `bear.id IN ${bearsWithColor}`;
      })
      .setParameter('colorName', colorName.toLowerCase())
      .orderBy('bear.name', 'ASC')
      .getMany();
  }

  create(dto: CreateBearDto): Promise<Bear> {
    const bear = this.bearsRepository.create({
      name: dto.name,
      size: dto.size,
      colors: [],
    });
    return this.bearsRepository.save(bear);
  }

  async update(dto: UpdateBearDto): Promise<Bear> {
    const bear = await this.bearsRepository.findOne({
      where: { id: dto.id },
      relations: { colors: true },
    });
    if (!bear) {
      throw new NotFoundException(`Bear ${dto.id} not found`);
    }

    if (dto.name !== undefined) {
      bear.name = dto.name;
    }
    if (dto.size !== undefined) {
      bear.size = dto.size;
    }
    if (dto.colors !== undefined) {
      bear.colors = await this.findColorsByIds(
        dto.colors.map((color) => color.id),
      );
    }

    return this.bearsRepository.save(bear);
  }

  async remove(id: string): Promise<void> {
    const result = await this.bearsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Bear ${id} not found`);
    }
  }

  private async findColorsByIds(ids: string[]): Promise<Color[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }
    const colors = await this.colorsRepository.findBy({ id: In(uniqueIds) });
    if (colors.length !== uniqueIds.length) {
      const found = new Set(colors.map((color) => color.id));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Colors not found: ${missing.join(', ')}`);
    }
    return colors;
  }
}
