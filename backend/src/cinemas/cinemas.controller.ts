import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IdParam } from '../id-param';
import { CreateCinemaDto } from './cinema.dto';
import { CinemasService } from './cinemas.service';

@ApiTags('Cinemas')
@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemas: CinemasService) {}

  @Get()
  @ApiOperation({ summary: 'List cinemas and their available seat bundles' })
  findAll() {
    return this.cinemas.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Add a cinema and its bundle sizes' })
  create(@Body() input: CreateCinemaDto) {
    return this.cinemas.create(input);
  }

  @Get(':id/booking')
  @ApiOperation({ summary: 'Find the fewest bundles that seat a group exactly' })
  @ApiQuery({ name: 'groupSize', type: Number, example: 6 })
  booking(@Param() { id }: IdParam, @Query('groupSize', ParseIntPipe) groupSize: number) {
    return this.cinemas.booking(id, groupSize);
  }
}
