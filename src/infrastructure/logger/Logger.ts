import pino from 'pino';

const logger = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  transport:
    process.env['LOG_PRETTY'] === 'true'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export class Logger {
  static info(message: string, context?: Record<string, unknown>): void {
    logger.info(context, message);
  }

  static error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    logger.error({ ...context, error }, message);
  }

  static warn(message: string, context?: Record<string, unknown>): void {
    logger.warn(context, message);
  }

  static debug(message: string, context?: Record<string, unknown>): void {
    logger.debug(context, message);
  }
}
