import { MusicEntity, MusicSchema } from '../music/music.schema';

import { CoverController } from './cover.controller';
import { CoverService } from './cover.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MusicModule } from '../music/music.module';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MusicEntity.name, schema: MusicSchema },
    ]),
    MusicModule,
  ],
  controllers: [CoverController],
  providers: [CoverService, AdminGuard],
  exports: [CoverService],
})
export class CoverModule {}
