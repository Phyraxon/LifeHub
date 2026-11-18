import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../../data/database';
import { exportIcs, importIcs } from './ics';

const record = (allDay: boolean): CalendarEvent => ({
  id: 'event-1', title: 'Kaffee, danach Planung', startAt: allDay ? '2026-11-18' : '2026-11-18T09:30:00.000Z',
  endAt: allDay ? '2026-11-18' : '2026-11-18T10:15:00.000Z', allDay, category: 'Persönlich', color: '#9b7bef',
  notes: 'Mit Team; Büro', createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
});

describe('calendar ICS', () => {
  it('exports and imports a timed event, including escaped text', () => {
    const [event] = importIcs(exportIcs([record(false)]), new Date('2026-11-01T00:00:00.000Z'));
    expect(event).toMatchObject({ title: 'Kaffee, danach Planung', startAt: '2026-11-18T09:30:00.000Z', endAt: '2026-11-18T10:15:00.000Z', notes: 'Mit Team; Büro', allDay: false });
  });

  it('preserves inclusive all-day dates when ICS uses an exclusive end date', () => {
    const [event] = importIcs(exportIcs([record(true)]), new Date('2026-11-01T00:00:00.000Z'));
    expect(event).toMatchObject({ startAt: '2026-11-18', endAt: '2026-11-18', allDay: true });
  });
});
