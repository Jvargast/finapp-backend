import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdateGoalDto } from './dto/update-goal.dto';

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

  @Post('join')
  @UseGuards(AuthGuard('jwt'))
  async joinGoal(@Req() req, @Body() body: { token: string }) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.goalsService.joinByToken(userId, body.token);
  }

  @Delete(':goalId/participants/:participantId')
  @UseGuards(AuthGuard('jwt'))
  async removeParticipant(
    @Req() req,
    @Param('goalId') goalId: string,
    @Param('participantId') participantId: string,
  ) {
    const requesterId = req.user.userId;

    return this.goalsService.removeParticipant(
      requesterId,
      goalId,
      participantId,
    );
  }
  @Post(':id/leave')
  @UseGuards(AuthGuard('jwt'))
  async leaveGoal(@Req() req, @Param('id') goalId: string) {
    return this.goalsService.leaveGoal(req.user.userId, goalId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    return this.goalsService.update(req.user.userId, id, updateGoalDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.goalsService.delete(userId, id);
  }
}
