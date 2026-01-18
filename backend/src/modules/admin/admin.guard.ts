import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const adminPassword = this.config.get<string>('ADMIN_PASSWORD');
    if (!adminPassword) {
      throw new UnauthorizedException('Admin access is not configured');
    }

    const req = context.switchToHttp().getRequest();
    const header: string | undefined =
      req.headers['x-admin-password'] || req.headers['X-Admin-Password'];

    if (!header || typeof header !== 'string') {
      throw new UnauthorizedException('Missing admin password');
    }

    if (header !== adminPassword) {
      throw new UnauthorizedException('Invalid admin password');
    }

    return true;
  }
}
