import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateMovieDto {
  @ApiProperty({ example: 'Iron Man', maxLength: 200 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 2008, minimum: 1888 })
  @IsInt()
  @Min(1888)
  @Max(2147483647)
  releaseYear!: number;

  @ApiProperty({ example: 126, minimum: 1, maximum: 300 })
  @IsInt()
  @Min(1)
  @Max(300)
  runtime!: number;

  @ApiPropertyOptional({ type: [Number], example: [] })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(2147483647, { each: true })
  prerequisites?: number[];

  @ApiPropertyOptional({ default: false })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  watched?: boolean;
}

export class UpdateMovieDto extends PickType(CreateMovieDto, ['watched', 'prerequisites'] as const) {}
