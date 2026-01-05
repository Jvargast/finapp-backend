import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}
  
  async create(userId: string, createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [
          { userId: userId },
          { userId: null },   
        ],
      },
      orderBy: { name: 'asc' },
    });
  }


  async findOne(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  update(id: number, updateCategoryDto: any) { return `Update #${id}`; }
  remove(id: number) { return `Remove #${id}`; }
}
