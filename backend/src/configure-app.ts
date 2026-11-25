import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor } from '@nestjs/common';

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.enableCors({ origin: allowedOrigins(), credentials: true });

  const config = new DocumentBuilder()
    .setTitle('HelpDeskPro')
    .setDescription('Support ticketing API for customers, agents, and admins.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}

/**
 * WEB_ORIGIN may be a comma-separated list.
 * localhost and 127.0.0.1 are the same machine, so a browser on either is accepted.
 */
export function allowedOrigins(): string[] {
  const configured = (process.env.WEB_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = new Set(configured);
  for (const origin of configured) {
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost') {
        url.hostname = '127.0.0.1';
        origins.add(url.origin);
      } else if (url.hostname === '127.0.0.1') {
        url.hostname = 'localhost';
        origins.add(url.origin);
      }
    } catch {
      origins.add(origin);
    }
  }
  return [...origins];
}
