import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * A color reference inside a bear. Colors are matched by id; `name` is
 * accepted so clients can send back the color objects they received,
 * but it is ignored.
 */
export class ColorRefDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdateBearDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  size?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColorRefDto)
  colors?: ColorRefDto[];
}
