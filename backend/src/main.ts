import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { static as staticFiles } from 'express';
import { setServers } from 'node:dns';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Configurá MONGODB_URI y JWT_SECRET (mínimo 32 caracteres).');
  }
  if (process.env.MONGODB_DNS_SERVERS) {
    setServers(process.env.MONGODB_DNS_SERVERS.split(',').map(server => server.trim()).filter(Boolean));
  }
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:4200').split(','), methods: 'GET,POST,PATCH,DELETE,OPTIONS' });
  app.use('/uploads', staticFiles(join(process.cwd(), 'uploads')));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(Number(process.env.PORT) || 3000);
}
void bootstrap();
