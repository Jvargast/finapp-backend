import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { IndicatorsService } from 'src/services/indicators.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [GoalsController],
  providers: [GoalsService, IndicatorsService, PrismaService],
  exports: [GoalsService],
})
export class GoalsModule {}
