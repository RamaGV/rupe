// src/database/database.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Módulo dedicado solo a la conexión de Mongo.
// Usamos forRootAsync + ConfigService en vez de forRoot() con un string
// hardcodeado para no tener el URI de Atlas (con user/password) escrito
// en el código - siempre sale del .env.
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
  ],
})
export class DatabaseModule {}