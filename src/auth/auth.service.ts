import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { CreateAuthDto } from './dto/create-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginAuthDto: LoginAuthDto) {
    const { email, password } = loginAuthDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'Usa el inicio de sesión con Google/Apple',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: this.formatUserResponse(user),
    };
  }

  async logout(userId: string) {
    if (!userId) return;
    await this.prisma.user.updateMany({
      where: { id: userId, hashedRefreshToken: { not: null } },
      data: { hashedRefreshToken: null },
    });
    return { message: 'Sesión cerrada exitosamente' };
  }

  async register(createAuthDto: CreateAuthDto) {
    const { firstName, lastName, email, password } = createAuthDto;

    const userExists = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      throw new ConflictException('El correo ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        provider: 'LOCAL',
        profile: {
          create: {
            firstName: firstName,
            lastName: lastName,
            mainCurrency: 'CLP',
            preferences: { mainGoal: 'save' },
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const tokens = await this.getTokens(
      newUser.id,
      newUser.email,
      newUser.role,
    );
    await this.updateRefreshTokenHash(newUser.id, tokens.refresh_token);

    return {
      ...tokens,
      user: this.formatUserResponse(newUser),
    };
  }

  async refreshTokens(rt: string) {
    const decoded = this.jwtService.decode(rt);
    if (!decoded || !decoded['sub']) {
      throw new ForbiddenException('Token malformado');
    }
    const userId = decoded['sub'];

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken)
      throw new ForbiddenException('Acceso Denegado');

    const rtMatches = await bcrypt.compare(rt, user.hashedRefreshToken);
    if (!rtMatches) throw new ForbiddenException('Acceso Denegado');

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) throw new ForbiddenException('Usuario no encontrado o inactivo');
    return this.formatUserResponse(user);
  }

  // HELPERS

  async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hash },
    });
  }

  async getTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }

  private formatUserResponse(user: any) {
    const profile = user.profile || {};
    const prefs = profile.preferences || {};

    const defaultAvatar = `https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}&background=4F46E5&color=fff&size=128`;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: profile.firstName || null,
      lastName: profile.lastName || null,
      username: profile.username || null,
      rut: profile.rut || null,
      phone: user.phone || null,
      avatar: profile.avatarUrl || defaultAvatar,
      preferences: {
        currency: profile.mainCurrency || 'CLP',
        mainGoal: prefs.mainGoal || 'save',
        darkMode: prefs.darkMode ?? false,
        notifications: prefs.notifications ?? true,
      },
    };
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
