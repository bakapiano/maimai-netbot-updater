import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { UserEntity } from '../users/user.schema';
import { MusicEntity } from '../music/music.schema';
import { SyncEntity } from '../sync/sync.schema';
import { CoverService } from '../cover/cover.service';
import { MusicService } from '../music/music.service';

export interface AdminStats {
  userCount: number;
  musicCount: number;
  syncCount: number;
  coverCount: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserEntity.name)
    private readonly userModel: Model<UserEntity>,
    @InjectModel(MusicEntity.name)
    private readonly musicModel: Model<MusicEntity>,
    @InjectModel(SyncEntity.name)
    private readonly syncModel: Model<SyncEntity>,
    private readonly coverService: CoverService,
    private readonly musicService: MusicService,
  ) {}

  async getStats(): Promise<AdminStats> {
    const [userCount, musicCount, syncCount, coverCount] = await Promise.all([
      this.userModel.countDocuments(),
      this.musicModel.countDocuments(),
      this.syncModel.countDocuments(),
      this.coverService.getCoverCount(),
    ]);

    return {
      userCount,
      musicCount,
      syncCount,
      coverCount,
    };
  }

  async getAllUsers() {
    const users = await this.userModel
      .find()
      .select({
        _id: 1,
        friendCode: 1,
        profile: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ createdAt: -1 })
      .lean();

    return users.map((u) => ({
      id: u._id.toString(),
      friendCode: u.friendCode,
      username: u.profile?.username ?? null,
      rating: u.profile?.rating ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  async syncCovers() {
    return this.coverService.syncAll();
  }

  async syncMusic() {
    return this.musicService.syncMusicData();
  }
}
