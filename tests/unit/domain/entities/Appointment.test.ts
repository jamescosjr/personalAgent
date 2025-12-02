import { Appointment } from '@domain/entities/Appointment';

describe('Appointment Entity', () => {
  const baseProps = {
    id: 'appt-1',
    userId: 'user-1',
    title: 'Consulta Dentista',
    dateTime: {
      start: new Date('2025-01-10T10:00:00.000Z'),
      end: new Date('2025-01-10T11:00:00.000Z'),
    },
  };

  it('deve criar um agendamento válido (caminho feliz)', () => {
    const appt = new Appointment(baseProps);
    expect(appt.id).toBe('appt-1');
    expect(appt.title).toBe('Consulta Dentista');
    expect(appt.status).toBe('Scheduled');
    expect(appt.dateTime.start.getTime()).toBe(new Date('2025-01-10T10:00:00.000Z').getTime());
    expect(appt.dateTime.end.getTime()).toBe(new Date('2025-01-10T11:00:00.000Z').getTime());
  });

  it('deve falhar se título for vazio', () => {
    expect(
      () =>
        new Appointment({
          ...baseProps,
          title: '   ',
        }),
    ).toThrow('Appointment title must be non-empty');
  });

  it('deve falhar se end < start', () => {
    expect(
      () =>
        new Appointment({
          ...baseProps,
          dateTime: {
            start: new Date('2025-01-10T11:00:00.000Z'),
            end: new Date('2025-01-10T10:00:00.000Z'),
          },
        }),
    ).toThrow('Appointment end must be after start');
  });

  it('deve permitir reagendar com intervalo válido', () => {
    const appt = new Appointment(baseProps);
    appt.reschedule({
      start: new Date('2025-01-11T09:00:00.000Z'),
      end: new Date('2025-01-11T10:00:00.000Z'),
    });
    expect(appt.dateTime.start.toISOString()).toBe('2025-01-11T09:00:00.000Z');
    expect(appt.dateTime.end.toISOString()).toBe('2025-01-11T10:00:00.000Z');
  });

  it('deve falhar ao reagendar com intervalo inválido', () => {
    const appt = new Appointment(baseProps);
    expect(() =>
      appt.reschedule({
        start: new Date('2025-01-11T11:00:00.000Z'),
        end: new Date('2025-01-11T10:00:00.000Z'),
      }),
    ).toThrow('end must be after start');
  });
});
