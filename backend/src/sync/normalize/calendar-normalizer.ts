type Timed = { dateTime?: string; date?: string; timeZone?: string };

type CalendarPayload = {
  id?: unknown;
  summary?: unknown;
  description?: unknown;
  location?: unknown;
  status?: unknown;
  htmlLink?: unknown;
  start?: Timed;
  end?: Timed;
  attendees?: unknown;
  organizer?: { email?: string };
  recurringEventId?: unknown;
};

export type NormalizedCalendarEvent = {
  providerEventId: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  timezone: string | null;
  attendees: unknown;
  htmlLink: string | null;
  raw: Record<string, unknown>;
};

function parseTime(value?: Timed): { at: Date; allDay: boolean; timezone?: string } | null {
  if (!value) return null;
  if (value.dateTime) {
    return {
      at: new Date(value.dateTime),
      allDay: false,
      timezone: value.timeZone,
    };
  }
  if (value.date) {
    return { at: new Date(`${value.date}T00:00:00.000Z`), allDay: true };
  }
  return null;
}

export function normalizeGoogleCalendarEvent(
  payload: Record<string, unknown>,
): NormalizedCalendarEvent | null {
  const data = payload as CalendarPayload;
  const id = typeof data.id === 'string' ? data.id : null;
  if (!id) return null;

  const start = parseTime(data.start);
  const end = parseTime(data.end);
  if (!start || !end) return null;

  return {
    providerEventId: id,
    title:
      typeof data.summary === 'string' && data.summary.length > 0
        ? data.summary
        : '(No title)',
    description: typeof data.description === 'string' ? data.description : null,
    location: typeof data.location === 'string' ? data.location : null,
    status: typeof data.status === 'string' ? data.status : null,
    startsAt: start.at,
    endsAt: end.at,
    allDay: start.allDay,
    timezone: start.timezone ?? end.timezone ?? null,
    attendees: data.attendees ?? [],
    htmlLink: typeof data.htmlLink === 'string' ? data.htmlLink : null,
    raw: payload,
  };
}
