import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { writeFile } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class PasswordResetMailer {
  private readonly logger = new Logger(PasswordResetMailer.name);

  private frontendUrl() {
    const raw = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4200');
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
        throw new Error('URL no segura');
      }
      return url;
    } catch { throw new ServiceUnavailableException('FRONTEND_URL debe ser una URL válida y HTTPS en producción.'); }
  }

  private localDelivery() {
    try {
      const host = this.frontendUrl().hostname;
      return process.env.NODE_ENV !== 'production' && process.env.PASSWORD_RESET_DEV_LOG === 'true' &&
        ['localhost', '127.0.0.1', '::1'].includes(host);
    } catch { return false; }
  }

  assertReady() {
    this.frontendUrl();
    const hasHost = !!process.env.SMTP_HOST;
    const hasFrom = !!process.env.SMTP_FROM;
    const hasUser = !!process.env.SMTP_USER;
    const hasPass = !!process.env.SMTP_PASS;
    if (hasHost && hasFrom && hasUser === hasPass) {
      const port = Number(process.env.SMTP_PORT || '587');
      if (Number.isInteger(port) && port > 0 && port <= 65535) return;
    }
    if (!hasHost && !hasFrom && this.localDelivery()) return;
    throw new ServiceUnavailableException('La recuperación por correo no está configurada.');
  }

  deliveryMode(): 'local' | 'email' {
    this.assertReady();
    return process.env.SMTP_HOST ? 'email' : 'local';
  }

  async send(email: string, token: string) {
    this.assertReady();
    const link = new URL('/restablecer-contrasena', this.frontendUrl());
    link.searchParams.set('token', token);

    if (!process.env.SMTP_HOST) {
      await writeFile(join(process.cwd(), '.password-reset-dev-link.txt'),
        `Enlace local de recuperación de Trama para ${email}\nVence en 30 minutos. No compartas este archivo.\n\n${link.toString()}\n`,
        { encoding: 'utf8', mode: 0o600 });
      this.logger.log('Enlace de recuperación local guardado en backend/.password-reset-dev-link.txt');
      return;
    }

    const port = Number(process.env.SMTP_PORT || '587');
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Recuperá tu contraseña de Trama',
        text: `Recibimos una solicitud para cambiar tu contraseña de Trama.\n\nAbrí este enlace dentro de los próximos 30 minutos:\n${link.toString()}\n\nSi no lo pediste, ignorá este correo.`,
      });
    } finally {
      transport.close();
    }
  }
}
