import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Expo } from 'expo-server-sdk';
//import { Cron } from '@nestjs/schedule';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private expo = new Expo();

  constructor(private prisma: PrismaService) {}

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data: any = {},
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    if (!user?.pushToken) {
      console.warn(`Usuario ${userId} no tiene pushToken.`);
      return { success: false, reason: 'No token' };
    }

    if (!Expo.isExpoPushToken(user.pushToken)) {
      console.error(`Token corrupto para usuario ${userId}: ${user.pushToken}`);
      return { success: false, reason: 'Invalid token' };
    }

    const messages = [
      {
        to: user.pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
      },
    ];

    try {
      const chunks = this.expo.chunkPushNotifications(messages as any);
      for (const chunk of chunks) {
        await this.expo.sendPushNotificationsAsync(chunk);
      }
      return { success: true };
    } catch (error) {
      console.error('Error enviando notificación:', error);
      return { success: false, error };
    }
  }

  //@Cron('*/30 * * * * *')
  //@Cron('0 20 * * *') --> a las 20:00 hrs todos los días
  async handleCronTest() {
    this.logger.debug('🕒 Ejecutando chequeo de gastos olvidados...');
    const users = await this.prisma.user.findMany({
      where: {
        pushToken: { not: null },
      },
      select: {
        id: true,
        pushToken: true,
        profile: {
          select: { firstName: true, preferences: true },
        },
      },
    });

    for (const user of users) {
      const name = user.profile?.firstName || 'Usuario';
      const prefs = (user.profile?.preferences as any) || {};
      if (prefs.notifications === false) {
        this.logger.debug(
          `🔕 Usuario ${user.id} tiene notificaciones desactivadas en App.`,
        );
        continue;
      }
      await this.sendToUser(
        user.id,
        `¡Hola ${name}! 👋`,
        '¿Hiciste algún gasto hoy? No olvides registrarlo.',
        { route: 'AddTransaction' },
      );
    }
  }
}
