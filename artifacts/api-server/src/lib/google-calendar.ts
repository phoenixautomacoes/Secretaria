// Google Calendar integration via Replit Connectors SDK
// Uses connector "google-calendar" for authenticated access (OAuth2 handled automatically)
import { ReplitConnectors } from "@replit/connectors-sdk";

const CALENDAR_ID = "primary";

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
}

function getConnectors() {
  return new ReplitConnectors();
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<string | null> {
  try {
    const connectors = getConnectors();
    const body = {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: { dateTime: input.startTime.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: input.endTime.toISOString(), timeZone: "America/Sao_Paulo" },
    };
    const response = await connectors.proxy(
      "google-calendar",
      `/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
      { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
    );
    const data = await response.json() as any;
    return data?.id ?? null;
  } catch (err) {
    console.error("Google Calendar createEvent error:", err);
    return null;
  }
}

export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput>
): Promise<void> {
  try {
    const connectors = getConnectors();
    const body: Record<string, any> = {};
    if (input.summary) body["summary"] = input.summary;
    if (input.description !== undefined) body["description"] = input.description;
    if (input.startTime) body["start"] = { dateTime: input.startTime.toISOString(), timeZone: "America/Sao_Paulo" };
    if (input.endTime) body["end"] = { dateTime: input.endTime.toISOString(), timeZone: "America/Sao_Paulo" };

    await connectors.proxy(
      "google-calendar",
      `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
      { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Google Calendar updateEvent error:", err);
  }
}

export async function cancelCalendarEvent(eventId: string): Promise<void> {
  try {
    const connectors = getConnectors();
    await connectors.proxy(
      "google-calendar",
      `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
      { method: "PATCH", body: JSON.stringify({ status: "cancelled" }), headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Google Calendar cancelEvent error:", err);
  }
}
