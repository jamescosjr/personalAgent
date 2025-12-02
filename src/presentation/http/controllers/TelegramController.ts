import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { Telegraf } from 'telegraf';
import { Update } from 'telegraf/types';
import { ProcessCommandUseCase } from '@application/use-cases/ProcessCommandUseCase';
import { Logger } from '@infrastructure/logger/Logger';

@injectable()
export class TelegramController {
  private bot: Telegraf;

  constructor(
    @inject('ProcessCommandUseCase') private processCommand: ProcessCommandUseCase,
  ) {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }
    this.bot = new Telegraf(token);
  }

  /**
   * Handler para webhook do Telegram
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const update = req.body as Update;

      Logger.debug('Received Telegram update', { updateId: update.update_id });

      // Responder rapidamente ao Telegram (200 OK) para evitar timeout
      res.status(200).send('OK');

      // Processar assincronamente
      await this.processUpdate(update);
    } catch (error) {
      Logger.error('Failed to handle Telegram webhook', error);
      // Mesmo com erro, retornar 200 para evitar retry infinito do Telegram
      if (!res.headersSent) {
        res.status(200).send('ERROR');
      }
    }
  }

  /**
   * Processa o update do Telegram
   */
  private async processUpdate(update: Update): Promise<void> {
    try {
      if (!('message' in update) || !update.message) {
        Logger.debug('Update without message, ignoring', { updateId: update.update_id });
        return;
      }

      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from?.id.toString();

      if (!userId) {
        Logger.warn('Message without userId', { chatId });
        return;
      }

      let input: string | Buffer;
      let mimeType: string | undefined;

      // Processar mensagem de TEXTO
      if ('text' in message && message.text) {
        input = message.text;
        Logger.info('Processing text message', { userId, chatId, text: message.text });
      }
      // Processar mensagem de VOZ
      else if ('voice' in message && message.voice) {
        const fileId = message.voice.file_id;
        Logger.info('Processing voice message', { userId, chatId, fileId });

        // Mostrar "digitando..." enquanto processa áudio
        await this.bot.telegram.sendChatAction(chatId, 'typing');

        // Obter link do arquivo de áudio
        const fileLink = await this.bot.telegram.getFileLink(fileId);
        const response = await fetch(fileLink.href);

        if (!response.ok) {
          throw new Error(`Failed to download voice file: ${response.statusText}`);
        }

        // Baixar arquivo como Buffer
        const arrayBuffer = await response.arrayBuffer();
        input = Buffer.from(arrayBuffer);
        mimeType = message.voice.mime_type || 'audio/ogg';
      }
      // Tipo de mensagem não suportado
      else {
        await this.bot.telegram.sendMessage(
          chatId,
          '❓ Envie um comando de texto ou mensagem de voz.',
        );
        return;
      }

      // Executar caso de uso
      const result = await this.processCommand.execute(userId, input, mimeType);

      // Enviar resposta formatada
      const icon = result.success ? '✅' : '❌';
      await this.bot.telegram.sendMessage(chatId, `${icon} ${result.message}`);

      Logger.info('Command processed successfully', {
        userId,
        chatId,
        success: result.success,
      });
    } catch (error) {
      Logger.error('Error processing Telegram update', error, {
        updateId: update.update_id,
      });

      // Notificar usuário sobre o erro
      if ('message' in update && update.message) {
        const chatId = update.message.chat.id;
        await this.bot.telegram.sendMessage(
          chatId,
          '⚠️ Desculpe, ocorreu um erro ao processar seu comando. Tente novamente.',
        );
      }
    }
  }

  /**
   * Configura o webhook do Telegram (produção ou desenvolvimento com ngrok)
   */
  async setWebhook(webhookUrl: string): Promise<void> {
    await this.bot.telegram.setWebhook(webhookUrl);
    Logger.info('Telegram webhook set', { webhookUrl });
  }

  /**
   * Remove webhook e usa polling local (apenas desenvolvimento)
   */
  async removeWebhook(): Promise<void> {
    await this.bot.telegram.deleteWebhook();
    Logger.info('Telegram webhook removed');
  }

  /**
   * Inicia polling mode (apenas desenvolvimento local)
   */
  async startPolling(): Promise<void> {
    this.bot.on('message', async (ctx) => {
      const update: Update = {
        update_id: ctx.update.update_id,
        message: ctx.message,
      };
      await this.processUpdate(update);
    });

    await this.bot.launch();
    Logger.info('Telegram bot started in polling mode');
  }
}
