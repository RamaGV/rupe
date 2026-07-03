// backend/src/app.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('debe devolver status "ok"', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
    });

    it('debe incluir un timestamp ISO válido', () => {
      const result = appController.getHealth();
      expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
    });
  });
});