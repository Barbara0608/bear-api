import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Bear } from './bear.entity';
import { BearsService } from './bears.service';
import { CreateBearDto } from './dto/create-bear.dto';
import { UpdateBearDto } from './dto/update-bear.dto';

@Controller('bears')
export class BearsController {
  constructor(private readonly bearsService: BearsService) {}

  @Get()
  findAll(): Promise<Bear[]> {
    return this.bearsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateBearDto): Promise<Bear> {
    return this.bearsService.create(dto);
  }

  /** Returns 200 with the updated bear instead of the spec's 204 (see README). */
  @Put()
  update(@Body() dto: UpdateBearDto): Promise<Bear> {
    return this.bearsService.update(dto);
  }

  @Delete(':bearId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('bearId', ParseUUIDPipe) bearId: string): Promise<void> {
    return this.bearsService.remove(bearId);
  }

  @Get(':minimumSize/:maximumSize')
  findBySizeRange(
    @Param('minimumSize', ParseIntPipe) minimumSize: number,
    @Param('maximumSize', ParseIntPipe) maximumSize: number,
  ): Promise<Bear[]> {
    return this.bearsService.findBySizeRange(minimumSize, maximumSize);
  }

  @Get(':color')
  findByColor(@Param('color') color: string): Promise<Bear[]> {
    return this.bearsService.findByColor(color);
  }
}
