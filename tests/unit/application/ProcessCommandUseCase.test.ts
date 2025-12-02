import 'reflect-metadata';
import { ProcessCommandUseCase } from '@application/use-cases/ProcessCommandUseCase';
import { IAIService } from '@domain/services/IAIService';
import { ICalendarService } from '@domain/services/ICalendarService';
import { IAppointmentRepository } from '@domain/repositories/IAppointmentRepository';
import { UserIntent } from '@application/dtos/UserIntents';
import { Appointment } from '@domain/entities/Appointment';

describe('ProcessCommandUseCase', () => {
  let useCase: ProcessCommandUseCase;
  let mockAIService: jest.Mocked<IAIService>;
  let mockCalendarService: jest.Mocked<ICalendarService>;
  let mockAppointmentRepo: jest.Mocked<IAppointmentRepository>;

  beforeEach(() => {
    mockAIService = {
      interpretCommand: jest.fn(),
    };

    mockCalendarService = {
      scheduleEvent: jest.fn(),
      checkAvailability: jest.fn(),
      listEvents: jest.fn(),
      updateEvent: jest.fn(),
      cancelEvent: jest.fn(),
    };

    mockAppointmentRepo = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByExternalRef: jest.fn(),
      findByDateRange: jest.fn(),
    };

    useCase = new ProcessCommandUseCase(mockAIService, mockCalendarService, mockAppointmentRepo);
  });

  describe('execute - SCHEDULE intent', () => {
    it('deve agendar com sucesso quando comando é interpretado corretamente', async () => {
      const userId = 'user-123';
      const input = 'Agendar dentista segunda às 10h';

      const intent: UserIntent = {
        type: 'SCHEDULE',
        data: {
          title: 'Dentista',
          start: new Date('2025-01-06T10:00:00Z'),
          end: new Date('2025-01-06T11:00:00Z'),
        },
        confidence: 0.95,
        rawText: input,
      };

      mockAIService.interpretCommand.mockResolvedValue(intent);
      mockCalendarService.checkAvailability.mockResolvedValue(true);
      mockCalendarService.scheduleEvent.mockResolvedValue('google-event-123');

      const result = await useCase.execute(userId, input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Agendamento criado com sucesso');
      expect(mockCalendarService.checkAvailability).toHaveBeenCalledWith(
        intent.data.start,
        intent.data.end,
        userId,
      );
      expect(mockCalendarService.scheduleEvent).toHaveBeenCalled();
      expect(mockAppointmentRepo.save).toHaveBeenCalled();
    });

    it('deve falhar quando há conflito de horário', async () => {
      const userId = 'user-123';
      const intent: UserIntent = {
        type: 'SCHEDULE',
        data: {
          title: 'Reunião',
          start: new Date('2025-01-06T14:00:00Z'),
          end: new Date('2025-01-06T15:00:00Z'),
        },
        confidence: 0.9,
        rawText: 'agendar reunião',
      };

      mockAIService.interpretCommand.mockResolvedValue(intent);
      mockCalendarService.checkAvailability.mockResolvedValue(false);

      const result = await useCase.execute(userId, 'agendar reunião');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Conflito detectado');
      expect(mockCalendarService.scheduleEvent).not.toHaveBeenCalled();
      expect(mockAppointmentRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('execute - RESCHEDULE intent', () => {
    it('deve reagendar com sucesso quando agendamento existe', async () => {
      const userId = 'user-123';
      const appointmentId = 'appt-456';

      const existingAppt = new Appointment({
        id: appointmentId,
        userId,
        title: 'Dentista',
        dateTime: {
          start: new Date('2025-01-06T10:00:00Z'),
          end: new Date('2025-01-06T11:00:00Z'),
        },
      });

      const intent: UserIntent = {
        type: 'RESCHEDULE',
        data: {
          appointmentId,
          newStart: new Date('2025-01-07T14:00:00Z'),
          newEnd: new Date('2025-01-07T15:00:00Z'),
        },
        confidence: 0.85,
        rawText: 'reagendar para terça 14h',
      };

      mockAIService.interpretCommand.mockResolvedValue(intent);
      mockAppointmentRepo.findById.mockResolvedValue(existingAppt);
      mockCalendarService.checkAvailability.mockResolvedValue(true);

      const result = await useCase.execute(userId, 'reagendar');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Reagendado');
      expect(mockCalendarService.updateEvent).toHaveBeenCalled();
      expect(mockAppointmentRepo.update).toHaveBeenCalled();
    });

    it('deve falhar quando agendamento não existe', async () => {
      const intent: UserIntent = {
        type: 'RESCHEDULE',
        data: {
          appointmentId: 'inexistente',
          newStart: new Date(),
          newEnd: new Date(),
        },
        confidence: 0.8,
        rawText: 'reagendar',
      };

      mockAIService.interpretCommand.mockResolvedValue(intent);
      mockAppointmentRepo.findById.mockResolvedValue(null);

      const result = await useCase.execute('user-123', 'reagendar');

      expect(result.success).toBe(false);
      expect(result.message).toContain('não encontrado');
    });
  });

  describe('execute - CANCEL intent', () => {
    it('deve cancelar agendamento com sucesso', async () => {
      const userId = 'user-123';
      const appointmentId = 'appt-789';

      const existingAppt = new Appointment({
        id: appointmentId,
        userId,
        title: 'Dentista',
        dateTime: {
          start: new Date('2025-01-06T10:00:00Z'),
          end: new Date('2025-01-06T11:00:00Z'),
        },
        externalRefs: { googleCalendarEventId: 'google-evt-123' },
      });

      const intent: UserIntent = {
        type: 'CANCEL',
        data: { appointmentId },
        confidence: 0.9,
        rawText: 'cancelar dentista',
      };

      mockAIService.interpretCommand.mockResolvedValue(intent);
      mockAppointmentRepo.findById.mockResolvedValue(existingAppt);

      const result = await useCase.execute(userId, 'cancelar');

      expect(result.success).toBe(true);
      expect(mockCalendarService.cancelEvent).toHaveBeenCalledWith('google-evt-123');
      expect(mockAppointmentRepo.update).toHaveBeenCalled();
    });
  });

  describe('execute - LIST intent', () => {
    it('deve listar agendamentos no período', async () => {
      const userId = 'user-123';
      const appointments = [
        new Appointment({
          id: 'appt-1',
          userId,
          title: 'Dentista',
          dateTime: {
            start: new Date('2025-01-06T10:00:00Z'),
            end: new Date('2025-01-06T11:00:00Z'),
          },
        }),
        new Appointment({
          id: 'appt-2',
          userId,
          title: 'Reunião',
          dateTime: {
            start: new Date('2025-01-07T14:00:00Z'),
            end: new Date('2025-01-07T15:00:00Z'),
          },
        }),
      ];

      const intent: UserIntent = {
        type: 'LIST',
        data: {},
        confidence: 0.95,
        rawText: 'listar compromissos',
      };

      mockAIService.interpretCommand.mockResolvedValue(intent);
      mockAppointmentRepo.findByDateRange.mockResolvedValue(appointments);

      const result = await useCase.execute(userId, 'listar');

      expect(result.success).toBe(true);
      expect(result.message).toContain('2 compromisso(s)');
      expect(result.data).toEqual(appointments);
    });

    it('deve retornar mensagem quando não há compromissos', async () => {
      const intent: UserIntent = {
        type: 'LIST',
        data: {},
        confidence: 0.9,
        rawText: 'listar',
      };

      mockAIService.interpretCommand.mockResolvedValue(intent);
      mockAppointmentRepo.findByDateRange.mockResolvedValue([]);

      const result = await useCase.execute('user-123', 'listar');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Nenhum compromisso');
    });
  });

  describe('execute - baixa confiança', () => {
    it('deve pedir reformulação quando confiança < 0.6', async () => {
      const intent: UserIntent = {
        type: 'UNKNOWN',
        message: 'Não entendi',
        confidence: 0.4,
        rawText: 'xyz abc',
      };

      mockAIService.interpretCommand.mockResolvedValue(intent);

      const result = await useCase.execute('user-123', 'xyz abc');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Não consegui entender');
    });
  });

  describe('execute - UNKNOWN intent', () => {
    it('deve retornar mensagem de erro para comando desconhecido', async () => {
      const intent: UserIntent = {
        type: 'UNKNOWN',
        message: 'Comando não reconhecido',
        confidence: 0.7,
        rawText: 'comando aleatório',
      };

      mockAIService.interpretCommand.mockResolvedValue(intent);

      const result = await useCase.execute('user-123', 'comando aleatório');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Comando não reconhecido');
    });
  });
});
