// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // ConfigModule.forRoot() lee el archivo .env y lo hace disponible
    // en toda la app a través de ConfigService.
    // isGlobal: true evita tener que importarlo en cada módulo.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env', // el .env está en la raíz del monorepo
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}