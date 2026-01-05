import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as Twilio from 'twilio';

@Injectable()
export class NotificationService {
  private transporter;
  private twilioClient;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    if (process.env.TWILIO_ACCOUNT_SID) {
      this.twilioClient = Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
    }
  }

  async sendEmailCode(to: string, code: string) {
    try {
      await this.transporter.sendMail({
        from: '"FinApp Security" <no-reply@finapp.com>',
        to,
        subject: '🔐 Tu código de verificación',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Verificación de Seguridad</h2>
            <p>Has solicitado cambiar tus datos. Usa el siguiente código para confirmar:</p>
            <h1 style="color: #4F46E5; letter-spacing: 5px;">${code}</h1>
            <p>Este código expira en 10 minutos.</p>
            <p style="font-size: 12px; color: #999;">Si no fuiste tú, ignora este mensaje.</p>
          </div>
        `,
      });
      console.log(`📧 Email enviado a ${to}`);
    } catch (error) {
      console.error('Error enviando email:', error);
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de verificación',
      );
    }
  }

  async sendSmsCode(to: string, code: string) {
    if (!this.twilioClient) {
      console.warn('⚠️ Twilio no está configurado en el .env');
      return;
    }

    try {
      await this.twilioClient.messages.create({
        body: `FinApp: Tu código de verificación es ${code}. No lo compartas.`,
        from: process.env.TWILIO_FROM_NUMBER,
        to: to,
      });
      console.log(`📱 SMS enviado a ${to}`);
    } catch (error) {
      console.error('Error enviando SMS:', error);
      throw new InternalServerErrorException(
        'No se pudo enviar el SMS. Verifica el número.',
      );
    }
  }
}
