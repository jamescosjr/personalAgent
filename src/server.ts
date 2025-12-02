// IMPORTANTE: Instrumentation DEVE ser o primeiro import (antes de qualquer outro módulo)
import './infrastructure/telemetry/instrumentation';

// Segundo import: reflect-metadata para TSyringe funcionar
import 'reflect-metadata';

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { container } from 'tsyringe';
import routes from './presentation/http/routes';
import { Logger } from './infrastructure/logger/Logger';
import { ProcessCommandUseCase } from '@application/use-cases/ProcessCommandUseCase';
import { IAIService } from '@domain/services/IAIService';
import { ICalendarService } from '@domain/services/ICalendarService';
import { GeminiService } from '@infrastructure/external/nlp/gemini/GeminiService';
import { GoogleCalendarService } from '@infrastructure/external/google/calendar/GoogleCalendarService';

// Carregar variáveis de ambiente
config();

// Registrar dependências no container TSyringe
container.register<IAIService>('IAIService', { useClass: GeminiService });
container.register<ICalendarService>('ICalendarService', { useClass: GoogleCalendarService });

// TODO: Registrar IAppointmentRepository quando implementar MongoDB
// container.register<IAppointmentRepository>('IAppointmentRepository', { useClass: MongooseAppointmentRepository });

container.register<ProcessCommandUseCase>('ProcessCommandUseCase', {
  useClass: ProcessCommandUseCase,
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error: Error) => {
  Logger.error('Uncaught Exception - Application will terminate', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  Logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

/**
 * Conecta ao MongoDB
 */
async function connectDatabase(): Promise<void> {
  const mongoUri = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/personal-agent';

  try {
    await mongoose.connect(mongoUri);
    Logger.info('MongoDB connected successfully', { uri: mongoUri.replace(/\/\/.*@/, '//<credentials>@') });
  } catch (error) {
    Logger.error('Failed to connect to MongoDB', error);
    throw error;
  }

  // Eventos de conexão
  mongoose.connection.on('error', (error) => {
    Logger.error('MongoDB connection error', error);
  });

  mongoose.connection.on('disconnected', () => {
    Logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    Logger.info('MongoDB reconnected');
  });
}

/**
 * Configura o Express App
 */
function createApp(): Application {
  const app = express();

  // Middlewares básicos
  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // Suportar áudios maiores
  app.use(express.urlencoded({ extended: true }));

  // Middleware de logging de requisições
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      Logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
      });
    });
    next();
  });

  // Registrar rotas
  app.use(routes);

  // Rota raiz
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'Personal Agent',
      version: process.env['npm_package_version'] || '1.0.0',
      status: 'running',
    });
  });

  // Handler 404
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
    });
  });

  // Error handler global
  app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    Logger.error('Express error handler', error, {
      method: req.method,
      path: req.path,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env['NODE_ENV'] === 'production' ? 'An error occurred' : error.message,
    });
  });

  return app;
}

/**
 * Inicia o servidor
 */
async function startServer(): Promise<void> {
  try {
    // Conectar ao MongoDB
    await connectDatabase();

    // Criar app Express
    const app = createApp();

    // Porta do servidor
    const port = parseInt(process.env['PORT'] || '3000', 10);

    // Iniciar servidor
    const server = app.listen(port, '0.0.0.0', () => {
      Logger.info('Server started successfully', {
        port,
        nodeEnv: process.env['NODE_ENV'] || 'development',
        nodeVersion: process.version,
      });
    });

    // Shutdown graceful
    const gracefulShutdown = async (signal: string) => {
      Logger.info(`${signal} received, starting graceful shutdown`);

      server.close(async () => {
        Logger.info('HTTP server closed');

        try {
          await mongoose.connection.close();
          Logger.info('MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          Logger.error('Error during shutdown', error);
          process.exit(1);
        }
      });

      // Forçar saída após 10 segundos
      setTimeout(() => {
        Logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    Logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Iniciar aplicação
startServer();
