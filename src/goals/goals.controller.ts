import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Delete,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Req() req, @Body() createGoalDto: CreateGoalDto) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.goalsService.create(userId, createGoalDto);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.goalsService.findOneWithAnalysis(userId, id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(@Req() req) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.goalsService.findAllWithAnalysis(userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.goalsService.delete(userId, id);
  }
}
