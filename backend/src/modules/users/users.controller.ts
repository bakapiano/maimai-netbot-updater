import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { getImportToken } from '../../common/prober/diving-fish/api';

type AuthedRequest = Request & { userId?: string };

function extractUserId(req: AuthedRequest): string | undefined {
  const typed = req as unknown as {
    user?: { sub?: unknown };
    userId?: unknown;
  };
  const candidate = typed.user?.sub ?? typed.userId;
  return typeof candidate === 'string' ? candidate : undefined;
}

@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('profile')
  async profile(@Req() req: AuthedRequest) {
    // AuthGuard populates req.user; also allow legacy req.userId
    const userId = extractUserId(req);
    if (!userId) {
      throw new BadRequestException('No user context');
    }
    return this.users.getById(userId);
  }

  @Patch('profile')
  async updateProfile(
    @Req() req: AuthedRequest,
    @Body()
    body: { divingFishImportToken?: unknown; lxnsImportToken?: unknown },
  ) {
    const userId = extractUserId(req);
    if (!userId) {
      throw new BadRequestException('No user context');
    }

    const divingFishToken = (() => {
      if (
        body.divingFishImportToken === undefined ||
        body.divingFishImportToken === null
      ) {
        return null;
      }
      if (typeof body.divingFishImportToken !== 'string') {
        throw new BadRequestException('divingFishImportToken must be a string');
      }
      return body.divingFishImportToken;
    })();

    const lxnsToken = (() => {
      if (body.lxnsImportToken === undefined || body.lxnsImportToken === null) {
        return null;
      }
      if (typeof body.lxnsImportToken !== 'string') {
        throw new BadRequestException('lxnsImportToken must be a string');
      }
      return body.lxnsImportToken;
    })();

    return this.users.update(userId, {
      divingFishImportToken: divingFishToken,
      lxnsImportToken: lxnsToken,
    });
  }

  /**
   * 通过水鱼账户的用户名和密码获取 import token
   * 注意：用户名和密码仅用于一次性获取 token，不会被保存
   * 如果用户已有 import token 则直接返回，不会生成新的
   */
  @Post('diving-fish/token')
  async getDivingFishToken(
    @Body() body: { username?: unknown; password?: unknown },
  ) {
    if (typeof body.username !== 'string' || !body.username) {
      throw new BadRequestException('username is required');
    }
    if (typeof body.password !== 'string' || !body.password) {
      throw new BadRequestException('password is required');
    }

    try {
      return await getImportToken(body.username, body.password);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '获取 token 失败';
      throw new BadRequestException(message);
    }
  }
}
