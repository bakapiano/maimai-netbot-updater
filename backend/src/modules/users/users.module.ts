import { Module, forwardRef } from '@nestjs/common';
import { UserEntity, UserSchema } from './user.schema';

import { AuthModule } from '../auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JobModule } from '../job/job.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => JobModule),
    forwardRef(() => AdminModule),
    MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
