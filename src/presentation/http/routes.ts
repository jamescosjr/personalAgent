import { Router, Request, Response } from 'express';
import { container } from 'tsyringe';
import { TelegramController } from './controllers/TelegramController';
import { Logger } from '@infrastructure/logger/Logger';

const router = Router();

/**
 * Health check endpoint para Docker/Kubernetes
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Webhook do Telegram
 */
router.post('/webhook/telegram', async (req: Request, res: Response) => {
  try {
    const telegramController = container.resolve(TelegramController);
    await telegramController.handleWebhook(req, res);
  } catch (error) {
    Logger.error('Error in Telegram webhook route', error);
    if (!res.headersSent) {
      res.status(200).send('ERROR');
    }
  }
});

export default router;
