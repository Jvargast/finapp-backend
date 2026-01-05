import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePreferencesDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import { Currency, Prisma } from '@prisma/client';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RequestChangeDto, SensitiveField } from './dto/request-change.dto';
import { VerifyChangeDto } from './dto/verify-change.dto';
import { NotificationService } from 'src/common/services/notification.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('Este email ya está registrado');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        profile: {
          create: {
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
            username: createUserDto.username,
            rut: createUserDto.rut,
          },
        },
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        profile: true,
      },
    });
    return newUser;
  }

  async completeSetup(userId: string, dto: CompleteSetupDto) {
    const { currency, initialBalance, mainGoal } = dto;

    return this.prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.userProfile.update({
        where: { userId },
        data: {
          mainCurrency: currency,
          preferences: {
            mainGoal: mainGoal,
            setupCompleted: true,
            notifications: true,
            darkMode: false,
          },
        },
      });

      await tx.account.create({
        data: {
          name: 'Efectivo',
          balance: initialBalance,
          currency: currency,
          userId: userId,
        },
      });

      return updatedProfile;
    });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const currentProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!currentProfile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const { currency, ...incomingJsonPrefs } = dto;
    const oldJsonPrefs = (currentProfile.preferences as any) || {};

    const newJsonPrefs = {
      ...oldJsonPrefs,
      ...incomingJsonPrefs,
    };

    if (incomingJsonPrefs.notifications !== undefined) {
      newJsonPrefs.notifications = incomingJsonPrefs.notifications;
    }

    if (incomingJsonPrefs.darkMode !== undefined) {
      newJsonPrefs.darkMode = incomingJsonPrefs.darkMode;
    }

    const profileUpdateData: Prisma.UserProfileUpdateInput = {
      preferences: newJsonPrefs as Prisma.InputJsonValue,
    };

    if (currency) {
      profileUpdateData.mainCurrency = currency as Currency;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          update: profileUpdateData,
        },
      },
      include: {
        profile: true,
      },
    });

    return this.formatUserResponse(updatedUser);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: newHashedPassword,
      },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async updateProfileSimple(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const exists = await this.prisma.userProfile.findFirst({
        where: {
          username: dto.username,
          NOT: { userId: userId },
        },
      });
      if (exists)
        throw new ConflictException('El nombre de usuario ya está en uso');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          update: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            username: dto.username,
            avatarUrl: dto.avatarUrl,
          },
        },
      },
      include: { profile: true },
    });

    return this.formatUserResponse(updated);
  }

  async requestSensitiveChange(userId: string, dto: RequestChangeDto) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.verificationCode.create({
      data: {
        userId,
        type: dto.field,
        newValue:
          dto.field === SensitiveField.EMAIL ? dto.newValue : dto.newValuePhone,
        code,
        expiresAt,
      },
    });

    if (dto.field === SensitiveField.EMAIL) {
      await this.notificationService.sendEmailCode(dto.newValue, code);
      return { message: `Código enviado a ${dto.newValue}` };
    } else if (dto.field === SensitiveField.PHONE) {
      await this.notificationService.sendSmsCode(dto.newValuePhone, code);
      return { message: `Código SMS enviado a ${dto.newValuePhone}` };
    }

    console.log(`🔒 CÓDIGO DE SEGURIDAD PARA CAMBIAR ${dto.field}: ${code}`);

    return {
      message: `Hemos enviado un código de verificación a ${dto.field === 'EMAIL' ? dto.newValue : dto.newValuePhone}`,
    };
  }

  async verifySensitiveChange(userId: string, dto: VerifyChangeDto) {
    const validCode = await this.prisma.verificationCode.findFirst({
      where: {
        userId,
        type: dto.field,
        code: dto.code,
        newValue: dto.newValue,
        expiresAt: { gt: new Date() },
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!validCode) {
      throw new BadRequestException('Código inválido o expirado');
    }

    if (dto.field === SensitiveField.EMAIL) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.newValue },
      });
      if (emailExists)
        throw new ConflictException('Este correo ya está en uso');

      await this.prisma.user.update({
        where: { id: userId },
        data: { email: dto.newValue },
      });
    } else if (dto.field === SensitiveField.PHONE) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { phone: dto.newValue },
      });
    }

    await this.prisma.verificationCode.update({
      where: { id: validCode.id },
      data: { used: true },
    });

    return { message: 'Datos actualizados con éxito' };
  }

  private formatUserResponse(user: any) {
    const profile = user.profile || {};
    const prefs = profile.preferences || {};
    const defaultAvatar = `https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}&background=4F46E5&color=fff&size=128`;

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      firstName: profile.firstName,
      lastName: profile.lastName,
      username: profile.username,
      rut: profile.rut,
      avatar: profile.avatarUrl || defaultAvatar,
      preferences: {
        currency: profile.mainCurrency || 'CLP',
        ...prefs,
      },
    };
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
