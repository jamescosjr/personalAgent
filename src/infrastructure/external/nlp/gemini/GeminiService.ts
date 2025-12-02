import { GoogleGenerativeAI } from '@google/generative-ai';
import { injectable } from 'tsyringe';
import { IAIService } from '@domain/services/IAIService';
import { UserIntent } from '@application/dtos/UserIntents';
import { Logger } from '@infrastructure/logger/Logger';

interface GeminiConfig {
  apiKey: string;
  model?: string;
}

@injectable()
export class GeminiService implements IAIService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(config?: GeminiConfig) {
    const apiKey = config?.apiKey || process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = config?.model || 'gemini-1.5-flash';
  }

  async interpretCommand(input: string | Buffer, mimeType?: string): Promise<UserIntent> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const systemPrompt = this.buildSystemPrompt();
      const userContent = this.buildUserContent(input, mimeType);

      Logger.debug('Sending command to Gemini', {
        model: this.modelName,
        inputType: typeof input === 'string' ? 'text' : 'audio',
        mimeType,
      });

      const result = await model.generateContent([systemPrompt, ...userContent]);
      const response = result.response;
      const text = response.text();

      Logger.debug('Received response from Gemini', { response: text });

      const parsed = JSON.parse(text) as UserIntent;

      Logger.info('Command interpreted successfully', {
        intentType: parsed.type,
        confidence: parsed.confidence,
      });

      return parsed;
    } catch (error) {
      Logger.error('Failed to interpret command with Gemini', error, {
        inputType: typeof input === 'string' ? 'text' : 'buffer',
      });

      return {
        type: 'UNKNOWN',
        message: 'Erro ao processar comando com IA',
        confidence: 0,
        rawText: typeof input === 'string' ? input : '<audio>',
      };
    }
  }

  private buildSystemPrompt(): string {
    const now = new Date();
    const dateContext = `Hoje é ${now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}. Hora atual: ${now.toLocaleTimeString('pt-BR')}.`;

    return `Você é um assistente de agendamento inteligente. Sua função é interpretar comandos do usuário e retornar JSON estruturado.

${dateContext}

SCHEMA DE RESPOSTA (retorne APENAS JSON válido, sem markdown):
{
  "type": "SCHEDULE" | "RESCHEDULE" | "CANCEL" | "LIST" | "UNKNOWN",
  "data": { ... }, // estrutura varia por tipo
  "confidence": 0.0 a 1.0,
  "rawText": "texto original"
}

TIPOS DE INTENÇÃO:

1. SCHEDULE (agendar novo compromisso):
{
  "type": "SCHEDULE",
  "data": {
    "title": "Título do compromisso",
    "start": "2025-12-10T10:00:00.000Z", // ISO 8601
    "end": "2025-12-10T11:00:00.000Z",
    "description": "opcional",
    "location": "opcional",
    "attendees": ["email@example.com"] // opcional
  },
  "confidence": 0.95,
  "rawText": "texto original"
}

2. RESCHEDULE (reagendar):
{
  "type": "RESCHEDULE",
  "data": {
    "appointmentId": "identificador do compromisso",
    "newStart": "2025-12-11T14:00:00.000Z",
    "newEnd": "2025-12-11T15:00:00.000Z"
  },
  "confidence": 0.85,
  "rawText": "texto original"
}

3. CANCEL (cancelar):
{
  "type": "CANCEL",
  "data": {
    "appointmentId": "identificador"
  },
  "confidence": 0.9,
  "rawText": "texto original"
}

4. LIST (listar compromissos):
{
  "type": "LIST",
  "data": {
    "start": "2025-12-01T00:00:00.000Z", // opcional
    "end": "2025-12-31T23:59:59.000Z" // opcional
  },
  "confidence": 0.95,
  "rawText": "texto original"
}

5. UNKNOWN (não entendeu):
{
  "type": "UNKNOWN",
  "message": "Não consegui entender o comando",
  "confidence": 0.3,
  "rawText": "texto original"
}

REGRAS:
- Interprete datas relativas: "segunda", "amanhã", "próxima semana", "daqui 2 dias"
- Use timezone America/Sao_Paulo (UTC-3) por padrão
- Duração padrão de compromisso: 1 hora se não especificado
- Se confiança < 0.6, retorne UNKNOWN
- Para reagendar/cancelar sem ID explícito, tente inferir pelo contexto (ex: "dentista") mas com confiança mais baixa
- Horário comercial padrão: 8h-18h
- Sempre retorne JSON válido`;
  }

  private buildUserContent(input: string | Buffer, mimeType?: string): Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> {
    if (typeof input === 'string') {
      return [{ text: input }];
    }

    // Áudio como buffer - converter para base64 inline data
    if (!mimeType) {
      throw new Error('mimeType is required for audio input');
    }

    return [
      {
        inlineData: {
          data: input.toString('base64'),
          mimeType,
        },
      },
    ];
  }
}
