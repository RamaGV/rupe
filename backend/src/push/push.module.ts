// backend/src/push/push.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PushSuscripcion,
  PushSuscripcionSchema,
  ConfigVapid,
  ConfigVapidSchema,
} from './push.schemas';
import { PushService } from './push.service';
import { PushController } from './push.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PushSuscripcion.name, schema: PushSuscripcionSchema },
      { name: ConfigVapid.name, schema: ConfigVapidSchema },
    ]),
  ],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
