import type { CalendarEvent } from '../../data/database';

const escapeIcs = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const formatUtc = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function exportIcs(events: CalendarEvent[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LIFEHUB//Calendar//DE'];
  for (const event of events) {
    lines.push('BEGIN:VEVENT', `UID:${event.id}@lifehub`, `DTSTAMP:${formatUtc(new Date(event.updatedAt))}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${event.startAt.replaceAll('-', '')}`);
      const end = new Date(`${event.endAt}T12:00:00`); end.setDate(end.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replaceAll('-', '')}`);
    } else {
      lines.push(`DTSTART:${formatUtc(new Date(event.startAt))}`, `DTEND:${formatUtc(new Date(event.endAt))}`);
    }
    lines.push(`SUMMARY:${escapeIcs(event.title)}`);
    if (event.notes) lines.push(`DESCRIPTION:${escapeIcs(event.notes)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

const unescapeIcs = (value: string) => value.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

function parseIcsDate(value: string, allDay: boolean): string {
  if (allDay) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  if (value.endsWith('Z')) {
    const utcParts = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z$/.exec(value);
    if (utcParts) return new Date(Date.UTC(Number(utcParts[1]), Number(utcParts[2]) - 1, Number(utcParts[3]), Number(utcParts[4]), Number(utcParts[5]), Number(utcParts[6] ?? 0))).toISOString();
    return new Date(value).toISOString();
  }
  const parts = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/.exec(value);
  const date = parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), Number(parts[4]), Number(parts[5]), Number(parts[6] ?? 0))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function importIcs(text: string, now = new Date()): Omit<CalendarEvent, 'id'>[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events: Omit<CalendarEvent, 'id'>[] = [];
  let current: Record<string, string> | null = null;
  for (const line of unfolded) {
    if (line === 'BEGIN:VEVENT') { current = {}; continue; }
    if (line === 'END:VEVENT' && current) {
      const startKey = Object.keys(current).find(key => key.startsWith('DTSTART'));
      const endKey = Object.keys(current).find(key => key.startsWith('DTEND'));
      const start = startKey ? current[startKey] : '';
      const end = endKey ? current[endKey] : start;
      const allDay = startKey?.includes('VALUE=DATE') ?? false;
      const title = current.SUMMARY;
      if (start && title) {
        const startAt = parseIcsDate(start, allDay);
        let endAt = parseIcsDate(end, allDay);
        if (allDay) {
          const exclusiveEnd = new Date(`${endAt}T12:00:00`); exclusiveEnd.setDate(exclusiveEnd.getDate() - 1);
          endAt = exclusiveEnd.toISOString().slice(0, 10);
        }
        events.push({ title: unescapeIcs(title), startAt, endAt, allDay, category: 'Persönlich', color: '#9b7bef', notes: unescapeIcs(current.DESCRIPTION ?? ''), createdAt: now.toISOString(), updatedAt: now.toISOString() });
      }
      current = null; continue;
    }
    if (!current) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1);
    const baseKey = key.split(';')[0];
    if (baseKey === 'SUMMARY' || baseKey === 'DESCRIPTION' || baseKey === 'DTSTART' || baseKey === 'DTEND') current[key.startsWith('DTSTART') || key.startsWith('DTEND') ? key : baseKey] = value;
  }
  return events;
}
