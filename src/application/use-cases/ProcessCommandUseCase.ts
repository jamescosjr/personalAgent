import { injectable, inject } from 'tsyringe';
import { v4 as uuid } from 'uuid';
import { Appointment } from '@domain/entities/Appointment';
import { IAIService } from '@domain/services/IAIService';
import { ICalendarService } from '@domain/services/ICalendarService';
import { IAppointmentRepository } from '@domain/repositories/IAppointmentRepository';
import { UserIntent } from '@application/dtos/UserIntents';

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

@injectable()
export class ProcessCommandUseCase {
  constructor(
    @inject('IAIService') private aiService: IAIService,
    @inject('ICalendarService') private calendarService: ICalendarService,
    @inject('IAppointmentRepository') private appointmentRepo: IAppointmentRepository,
  ) {}

  async execute(userId: string, input: string | Buffer, mimeType?: string): Promise<CommandResult> {
    try {
      const intent = await this.aiService.interpretCommand(input, mimeType);

      if (intent.confidence < 0.6) {
        return {
          success: false,
          message: 'Não consegui entender seu comando. Pode reformular?',
        };
      }

      switch (intent.type) {
        case 'SCHEDULE':
          return await this.handleSchedule(userId, intent as Extract<UserIntent, { type: 'SCHEDULE' }>);
        case 'RESCHEDULE':
          return await this.handleReschedule(userId, intent as Extract<UserIntent, { type: 'RESCHEDULE' }>);
        case 'CANCEL':
          return await this.handleCancel(userId, intent as Extract<UserIntent, { type: 'CANCEL' }>);
        case 'LIST':
          return await this.handleList(userId, intent as Extract<UserIntent, { type: 'LIST' }>);
        case 'UNKNOWN':
          return {
            success: false,
            message: (intent as Extract<UserIntent, { type: 'UNKNOWN' }>).message,
          };
        default:
          return {
            success: false,
            message: 'Comando não reconhecido.',
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erro ao processar comando: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      };
    }
  }

  private async handleSchedule(userId: string, intent: Extract<UserIntent, { type: 'SCHEDULE' }>): Promise<CommandResult> {
    const { title, start, end, description, location, attendees } = intent.data;

    // Validar disponibilidade
    const isAvailable = await this.calendarService.checkAvailability(start, end, userId);
    if (!isAvailable) {
      return {
        success: false,
        message: `Conflito detectado: você já tem compromisso entre ${start.toLocaleString()} e ${end.toLocaleString()}.`,
      };
    }

    // Criar entidade de domínio
    const appointment = new Appointment({
      id: uuid(),
      userId,
      title,
      description,
      dateTime: { start, end },
      location,
      attendees,
      source: 'assistant',
    });

    // Agendar no calendário externo
    const externalId = await this.calendarService.scheduleEvent(appointment);

    // Atualizar com referência externa e persistir
    const updatedAppointment = new Appointment({
      id: appointment.id,
      userId: appointment.userId,
      title: appointment.title,
      description: appointment.description,
      dateTime: appointment.dateTime,
      location: appointment.location,
      attendees: appointment.attendees,
      source: appointment.source,
      status: appointment.status,
      externalRefs: { googleCalendarEventId: externalId },
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    });
    await this.appointmentRepo.save(updatedAppointment);

    return {
      success: true,
      message: `Agendamento criado com sucesso: "${title}" em ${start.toLocaleString()}.`,
      data: { appointmentId: appointment.id, externalId },
    };
  }

  private async handleReschedule(userId: string, intent: Extract<UserIntent, { type: 'RESCHEDULE' }>): Promise<CommandResult> {
    const { appointmentId, newStart, newEnd } = intent.data;

    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment || appointment.userId !== userId) {
      return { success: false, message: 'Agendamento não encontrado.' };
    }

    // Validar nova disponibilidade
    const isAvailable = await this.calendarService.checkAvailability(newStart, newEnd, userId);
    if (!isAvailable) {
      return { success: false, message: 'Conflito no novo horário.' };
    }

    appointment.reschedule({ start: newStart, end: newEnd });
    await this.calendarService.updateEvent(appointment);
    await this.appointmentRepo.update(appointment);

    return {
      success: true,
      message: `Reagendado para ${newStart.toLocaleString()}.`,
    };
  }

  private async handleCancel(userId: string, intent: Extract<UserIntent, { type: 'CANCEL' }>): Promise<CommandResult> {
    const { appointmentId } = intent.data;

    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment || appointment.userId !== userId) {
      return { success: false, message: 'Agendamento não encontrado.' };
    }

    if (appointment.externalRefs?.googleCalendarEventId) {
      await this.calendarService.cancelEvent(appointment.externalRefs.googleCalendarEventId);
    }

    appointment.cancel();
    await this.appointmentRepo.update(appointment);

    return { success: true, message: 'Agendamento cancelado.' };
  }

  private async handleList(userId: string, intent: Extract<UserIntent, { type: 'LIST' }>): Promise<CommandResult> {
    const { start, end } = intent.data;
    const rangeStart = start ?? new Date();
    const rangeEnd = end ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const appointments = await this.appointmentRepo.findByDateRange({ start: rangeStart, end: rangeEnd, userId });

    if (appointments.length === 0) {
      return { success: true, message: 'Nenhum compromisso neste período.', data: [] };
    }

    const summary = appointments.map((a) => `- ${a.title} em ${a.dateTime.start.toLocaleString()}`).join('\n');
    return {
      success: true,
      message: `Você tem ${appointments.length} compromisso(s):\n${summary}`,
      data: appointments,
    };
  }
}
