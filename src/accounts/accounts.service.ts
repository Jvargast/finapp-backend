import { Injectable } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAccountDto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        ...createAccountDto,
        userId: userId, 
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId: userId },
      include: {
        transactions: true 
      }
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.account.findFirst({
      where: { 
        id: id,
        userId: userId 
      },
    });
  }

  update(id: number, updateAccountDto: UpdateAccountDto) {
    return `This action updates a #${id} account`;
  }

  remove(id: number) {
    return `This action removes a #${id} account`;
  }
}
