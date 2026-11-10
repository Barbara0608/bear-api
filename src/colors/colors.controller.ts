import { Body, Controller, Get, Post } from '@nestjs/common';
import { Color } from './color.entity';
import { ColorsService } from './colors.service';
import { CreateColorDto } from './dto/create-color.dto';

@Controller('colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Get()
  findAll(): Promise<Color[]> {
    return this.colorsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateColorDto): Promise<Color> {
    return this.colorsService.create(dto);
  }
}
