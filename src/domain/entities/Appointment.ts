export type AppointmentStatus = 'Scheduled' | 'Cancelled';

export interface DateTimeRange {
  start: Date;
  end: Date;
}

export interface AppointmentProps {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dateTime: DateTimeRange;
  location?: string;
  attendees?: string[];
  source?: 'user' | 'assistant' | 'import';
  externalRefs?: {
    googleCalendarEventId?: string;
  };
  status?: AppointmentStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Appointment {
  private readonly _id: string;
  private readonly _userId: string;
  private _title: string;
  private _description?: string;
  private _dateTime: DateTimeRange;
  private _location?: string;
  private _attendees: string[];
  private _source: 'user' | 'assistant' | 'import';
  private _externalRefs?: { googleCalendarEventId?: string };
  private _status: AppointmentStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: AppointmentProps) {
    if (!props.id || !props.userId) {
      throw new Error('Appointment requires id and userId');
    }
    if (!props.title || props.title.trim().length === 0) {
      throw new Error('Appointment title must be non-empty');
    }
    if (!props.dateTime?.start || !props.dateTime?.end) {
      throw new Error('Appointment dateTime must have start and end');
    }
    if (props.dateTime.end <= props.dateTime.start) {
      throw new Error('Appointment end must be after start');
    }

    this._id = props.id;
    this._userId = props.userId;
    this._title = props.title.trim();
    this._description = props.description?.trim();
    this._dateTime = { start: new Date(props.dateTime.start), end: new Date(props.dateTime.end) };
    this._location = props.location?.trim();
    this._attendees = Array.isArray(props.attendees) ? props.attendees.slice() : [];
    this._source = props.source ?? 'assistant';
    this._externalRefs = props.externalRefs;
    this._status = props.status ?? 'Scheduled';
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get title(): string { return this._title; }
  get description(): string | undefined { return this._description; }
  get dateTime(): DateTimeRange { return { ...this._dateTime }; }
  get location(): string | undefined { return this._location; }
  get attendees(): string[] { return this._attendees.slice(); }
  get source(): 'user' | 'assistant' | 'import' { return this._source; }
  get externalRefs(): { googleCalendarEventId?: string } | undefined { return this._externalRefs; }
  get status(): AppointmentStatus { return this._status; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get updatedAt(): Date { return new Date(this._updatedAt); }

  reschedule(newRange: DateTimeRange): void {
    if (!newRange?.start || !newRange?.end) {
      throw new Error('newRange must have start and end');
    }
    if (newRange.end <= newRange.start) {
      throw new Error('end must be after start');
    }
    this._dateTime = { start: new Date(newRange.start), end: new Date(newRange.end) };
    this.touch();
  }

  cancel(): void {
    this._status = 'Cancelled';
    this.touch();
  }

  rename(newTitle: string): void {
    const t = newTitle?.trim();
    if (!t) throw new Error('title must be non-empty');
    this._title = t;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
