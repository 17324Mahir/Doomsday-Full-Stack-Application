import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCinemaDto {
  @ApiProperty({ example: 'Star Cinema', maxLength: 200 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ type: [Number], example: [1, 3, 4], minItems: 1, maxItems: 10, uniqueItems: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(500, { each: true })
  bundleSizes!: number[];
}
