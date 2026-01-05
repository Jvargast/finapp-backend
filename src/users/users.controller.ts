import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  UnauthorizedException,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePreferencesDto } from './dto/update-user.dto';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import { AuthGuard } from '@nestjs/passport';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RequestChangeDto } from './dto/request-change.dto';
import { VerifyChangeDto } from './dto/verify-change.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('setup')
  async completeSetup(@Req() req, @Body() dto: CompleteSetupDto) {
    return this.usersService.completeSetup(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/preferences')
  async updatePreferences(@Req() req, @Body() dto: UpdatePreferencesDto) {
    const userId = req.user?.sub || req.user?.id || req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('ID de usuario no encontrado');
    }

    return this.usersService.updatePreferences(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/password')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user?.sub || req.user?.id || req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('ID de usuario no encontrado');
    }

    return this.usersService.changePassword(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/profile')
  async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.sub || req.user?.id || req.user?.userId;
    return this.usersService.updateProfileSimple(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/request-change')
  async requestSensitiveChange(@Req() req, @Body() dto: RequestChangeDto) {
    const userId = req.user?.sub || req.user?.id || req.user?.userId;
    return this.usersService.requestSensitiveChange(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/verify-change')
  async verifySensitiveChange(@Req() req, @Body() dto: VerifyChangeDto) {
    const userId = req.user?.sub || req.user?.id || req.user?.userId;
    return this.usersService.verifySensitiveChange(userId, dto);
  }

  @Post('upload-avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(
            new BadRequestException('Solo se permiten archivos de imagen'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadAvatar(@Req() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se subió ningún archivo');
    }
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${file.filename}`;

    const userId = req.user?.sub || req.user?.id || req.user?.userId;
    return this.usersService.updateProfileSimple(userId, {
      avatarUrl: fileUrl,
    });
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
