import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Color } from '../colors/color.entity';
import { Bear } from './bear.entity';
import { BearsController } from './bears.controller';
import { BearsService } from './bears.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bear, Color])],
  controllers: [BearsController],
  providers: [BearsService],
})
export class BearsModule {}
