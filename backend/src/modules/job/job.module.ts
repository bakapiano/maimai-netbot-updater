import { JobEntity, JobSchema } from './job.schema';
import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: JobEntity.name, schema: JobSchema }]),
    forwardRef(() => SyncModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [JobController],
  providers: [JobService],
  exports: [JobService],
})
export class JobModule {}
