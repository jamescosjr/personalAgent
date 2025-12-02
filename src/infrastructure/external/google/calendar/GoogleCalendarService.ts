import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { injectable } from 'tsyringe';
import { ICalendarService } from '@domain/services/ICalendarService';
import { Appointment } from '@domain/entities/Appointment';
import { Logger } from '@infrastructure/logger/Logger';

interface GoogleCalendarConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

@injectable()
export class GoogleCalendarService implements ICalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;

  constructor(config?: GoogleCalendarConfig) {
    const clientId = config?.clientId || process.env['GOOGLE_CLIENT_ID'];
    const clientSecret = config?.clientSecret || process.env['GOOGLE_CLIENT_SECRET'];
    const refreshToken = config?.refreshToken || process.env['GOOGLE_REFRESH_TOKEN'];

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

    if (refreshToken) {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    }

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    Logger.info('GoogleCalendarService initialized');
  }

  async scheduleEvent(event: Appointment): Promise<string> {
    try {
      const calendarEvent: calendar_v3.Schema$Event = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.dateTime.start.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: event.dateTime.end.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        attendees: event.attendees?.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'email', minutes: 24 * 60 },
          ],
        },
      };

      Logger.debug('Creating event on Google Calendar', {
        title: event.title,
        start: event.dateTime.start.toISOString(),
      });

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: calendarEvent,
      });

      const eventId = response.data.id;
      if (!eventId) {
        throw new Error('Google Calendar did not return event ID');
      }

      Logger.info('Event created on Google Calendar', {
        eventId,
        title: event.title,
        htmlLink: response.data.htmlLink,
      });

      return eventId;
    } catch (error) {
      Logger.error('Failed to create event on Google Calendar', error, {
        appointmentId: event.id,
        title: event.title,
      });
      throw new Error(`Failed to schedule event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkAvailability(start: Date, end: Date, userId: string): Promise<boolean> {
    try {
      Logger.debug('Checking availability on Google Calendar', {
        start: start.toISOString(),
        end: end.toISOString(),
        userId,
      });

      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busySlots = response.data.calendars?.['primary']?.busy || [];
      const isAvailable = busySlots.length === 0;

      Logger.debug('Availability check result', {
        isAvailable,
        conflictsCount: busySlots.length,
      });

      return isAvailable;
    } catch (error) {
      Logger.error('Failed to check availability', error);
      throw new Error(`Failed to check availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listEvents(start: Date, end: Date, userId: string): Promise<Appointment[]> {
    try {
      Logger.debug('Listing events from Google Calendar', {
        start: start.toISOString(),
        end: end.toISOString(),
        userId,
      });

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      const appointments = events
        .filter((event) => event.start?.dateTime && event.end?.dateTime)
        .map(
          (event) =>
            new Appointment({
              id: event.id || 'unknown',
              userId,
              title: event.summary || 'Sem título',
              description: event.description || undefined,
              dateTime: {
                start: new Date(event.start!.dateTime!),
                end: new Date(event.end!.dateTime!),
              },
              location: event.location || undefined,
              source: 'import',
              externalRefs: { googleCalendarEventId: event.id || undefined },
            }),
        );

      Logger.info('Events listed from Google Calendar', { count: appointments.length });

      return appointments;
    } catch (error) {
      Logger.error('Failed to list events', error);
      throw new Error(`Failed to list events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateEvent(event: Appointment): Promise<void> {
    try {
      const eventId = event.externalRefs?.googleCalendarEventId;
      if (!eventId) {
        throw new Error('Event does not have Google Calendar ID');
      }

      const calendarEvent: calendar_v3.Schema$Event = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.dateTime.start.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: event.dateTime.end.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        attendees: event.attendees?.map((email) => ({ email })),
      };

      Logger.debug('Updating event on Google Calendar', {
        eventId,
        title: event.title,
      });

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: calendarEvent,
      });

      Logger.info('Event updated on Google Calendar', { eventId, title: event.title });
    } catch (error) {
      Logger.error('Failed to update event', error, {
        appointmentId: event.id,
        externalId: event.externalRefs?.googleCalendarEventId,
      });
      throw new Error(`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelEvent(externalEventId: string): Promise<void> {
    try {
      Logger.debug('Canceling event on Google Calendar', { eventId: externalEventId });

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: externalEventId,
      });

      Logger.info('Event canceled on Google Calendar', { eventId: externalEventId });
    } catch (error) {
      Logger.error('Failed to cancel event', error, { eventId: externalEventId });
      throw new Error(`Failed to cancel event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
