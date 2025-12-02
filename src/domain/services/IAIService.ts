export interface UserIntent {
  type: 'SCHEDULE' | 'RESCHEDULE' | 'CANCEL' | 'LIST' | 'UNKNOWN';
  data?: unknown;
  confidence: number;
  rawText?: string;
}

export interface IAIService {
  /**
   * Interpreta comando do usuário (texto ou áudio) e retorna intenção estruturada.
   * @param input - Texto ou buffer de áudio
   * @param mimeType - MIME type do áudio (ex: 'audio/ogg')
   */
  interpretCommand(input: string | Buffer, mimeType?: string): Promise<UserIntent>;
}
