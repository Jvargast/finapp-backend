import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
    });
    if (!account) throw new BadRequestException('Cuenta no encontrada o no te pertenece');

    const category = await this.prisma.category.findFirst({
      where: { 
        id: dto.categoryId,
        OR: [{ userId }, { userId: null }] 
      }
    });
    if (!category) throw new BadRequestException('Categoría inválida');

    return this.prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          amount: dto.amount,
          type: dto.type,
          description: dto.description,
          date: dto.date || new Date(), 
          accountId: dto.accountId,
          categoryId: dto.categoryId,
        },
      });

      const movement = dto.type === 'EXPENSE' ? -Number(dto.amount) : Number(dto.amount);
      
      await tx.account.update({
        where: { id: dto.accountId },
        data: {
          balance: { increment: movement }, 
        },
      });

      return newTransaction;
    });
  }

  async findAll(userId: string) {
    return this.prisma.transaction.findMany({
      where: { account: { userId } }, 
      include: { 
        category: { select: { name: true, icon: true, color: true } }, 
        account: { select: { name: true, currency: true } }
      },
      orderBy: { date: 'desc' } 
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}
