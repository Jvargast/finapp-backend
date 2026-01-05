import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/common/services/notification.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, NotificationService],
})
export class UsersModule {}
