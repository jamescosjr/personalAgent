import { Appointment } from '@domain/entities/Appointment';

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface ICalendarService {
  /**
   * Agenda um evento no calendário externo (Google Calendar).
   * @returns ID externo do evento criado
   */
  scheduleEvent(event: Appointment): Promise<string>;

  /**
   * Verifica disponibilidade em um período.
   */
  checkAvailability(start: Date, end: Date, userId: string): Promise<boolean>;

  /**
   * Lista eventos em um intervalo de datas.
   */
  listEvents(start: Date, end: Date, userId: string): Promise<Appointment[]>;

  /**
   * Atualiza um evento existente.
   */
  updateEvent(event: Appointment): Promise<void>;

  /**
   * Cancela/remove um evento.
   */
  cancelEvent(externalEventId: string): Promise<void>;
}
