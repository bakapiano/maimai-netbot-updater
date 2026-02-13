import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import type { HydratedDocument } from 'mongoose';

@Schema({ collection: 'bot_statuses' })
export class BotStatusEntity {
  @Prop({ required: true, unique: true, index: true })
  friendCode!: string;

  @Prop({ required: true })
  available!: boolean;

  @Prop({ required: true })
  lastReportedAt!: Date;

  @Prop({ type: Number, default: null })
  friendCount!: number | null;
}

export type BotStatusDocument = HydratedDocument<BotStatusEntity>;
export const BotStatusSchema = SchemaFactory.createForClass(BotStatusEntity);
