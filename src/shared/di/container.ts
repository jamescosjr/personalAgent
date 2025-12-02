import 'reflect-metadata';
import { container } from 'tsyringe';
import { IAIService } from '@domain/services/IAIService';
import { ICalendarService } from '@domain/services/ICalendarService';
import { GeminiService } from '@infrastructure/external/nlp/gemini/GeminiService';
import { GoogleCalendarService } from '@infrastructure/external/google/calendar/GoogleCalendarService';

// Register domain service implementations
container.register<IAIService>('IAIService', {
  useClass: GeminiService,
});

container.register<ICalendarService>('ICalendarService', {
  useClass: GoogleCalendarService,
});

export { container };
