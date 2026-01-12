import { json, urlencoded } from 'express';

import { AddressInfo } from 'net';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Match the legacy job-service payload size expectations (job result can be large)
  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ extended: true, limit: '100mb' }));
  app.enableCors({ origin: true });
  app.setGlobalPrefix('api');
  const preferredPort = Number(process.env.PORT ?? 9050);
  const host = process.env.HOST ?? '0.0.0.0';
  const fallbackPort = Number(process.env.FALLBACK_PORT ?? 0) || 0; // 0 lets OS pick a free port

  try {
    await app.listen(preferredPort, host);
  } catch (err: any) {
    if (err?.code === 'EACCES' || err?.code === 'EADDRINUSE') {
      // Retry with a fallback (or random free port) instead of crashing on bind errors
      await app.listen(fallbackPort, host);
      const addr = app.getHttpServer().address() as AddressInfo;
      console.warn(
        `Port ${preferredPort} unavailable (${err?.code}); using ${addr.address}:${addr.port}`,
      );
    } else {
      throw err;
    }
  }
}
bootstrap();
