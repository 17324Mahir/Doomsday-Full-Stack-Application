import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IdParam } from '../id-param';
import { CreateMovieDto, UpdateMovieDto } from './movie.dto';
import { MoviesService } from './movies.service';

@ApiTags('Movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly movies: MoviesService) {}

  @Get()
  @ApiOperation({ summary: 'List movies and their direct prerequisites' })
  findAll() {
    return this.movies.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Add a movie to the catalog' })
  create(@Body() input: CreateMovieDto) {
    return this.movies.create(input);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a movie’s watched status or prerequisites' })
  update(@Param() { id }: IdParam, @Body() input: UpdateMovieDto) {
    return this.movies.update(id, input);
  }

  @Get(':id/rewatch-order')
  @ApiOperation({ summary: 'Plan the prerequisites for a target movie' })
  rewatchOrder(@Param() { id }: IdParam) {
    return this.movies.rewatchOrder(id);
  }
}
