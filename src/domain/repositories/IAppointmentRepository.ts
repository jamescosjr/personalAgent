import { Appointment } from '@domain/entities/Appointment';

export interface FindDateRange {
  start: Date;
  end: Date;
  userId?: string;
}

export interface IAppointmentRepository {
  save(appointment: Appointment): Promise<void>;
  update(appointment: Appointment): Promise<void>;
  findById(id: string): Promise<Appointment | null>;
  findByExternalRef(externalId: string): Promise<Appointment | null>;
  findByDateRange(range: FindDateRange): Promise<Appointment[]>;
}
