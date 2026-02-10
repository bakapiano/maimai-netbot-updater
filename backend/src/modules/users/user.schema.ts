import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

import type { HydratedDocument } from 'mongoose';
import type { UserNetProfile } from './user.types';

@Schema({ timestamps: true })
export class UserEntity {
  @Prop({ required: true, unique: true, index: true })
  friendCode!: string;

  @Prop({ type: String, default: null })
  divingFishImportToken!: string | null;

  @Prop({ type: String, default: null })
  lxnsImportToken!: string | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: undefined })
  profile?: UserNetProfile | null;

  @Prop({ type: String, default: null })
  idleUpdateBotFriendCode!: string | null;
}

export type UserDocument = HydratedDocument<UserEntity>;
export const UserSchema = SchemaFactory.createForClass(UserEntity);
