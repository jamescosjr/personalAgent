export interface ScheduleIntentData {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  attendees?: string[];
}

export interface RescheduleIntentData {
  appointmentId: string;
  newStart: Date;
  newEnd: Date;
}

export interface CancelIntentData {
  appointmentId: string;
}

export interface ListIntentData {
  start?: Date;
  end?: Date;
}

export type UserIntent =
  | { type: 'SCHEDULE'; data: ScheduleIntentData; confidence: number; rawText: string }
  | { type: 'RESCHEDULE'; data: RescheduleIntentData; confidence: number; rawText: string }
  | { type: 'CANCEL'; data: CancelIntentData; confidence: number; rawText: string }
  | { type: 'LIST'; data: ListIntentData; confidence: number; rawText: string }
  | { type: 'UNKNOWN'; message: string; confidence: number; rawText: string };
