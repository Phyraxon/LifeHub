import { db } from '../../data/database';

export interface ReminderItem {
  id: string;
  title: string;
  detail: string;
  date: string;
  route: string;
  severity: 'overdue' | 'soon' | 'upcoming';
}

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const plusDays = (date: Date, days: number) => { const result = new Date(date); result.setDate(result.getDate() + days); return dayKey(result); };

export async function getReminders(now = new Date()): Promise<ReminderItem[]> {
  const today = dayKey(now);
  const [tasks, events, household, contracts, devices] = await Promise.all([
    db.tasks.toArray(), db.events.toArray(), db.householdTasks.toArray(),
    db.contracts.toArray(), db.devices.toArray(),
  ]);
  const reminders: ReminderItem[] = [];
  for (const task of tasks) if (!task.completedAt && task.dueAt && task.dueAt <= plusDays(now, 1)) reminders.push({ id: `task:${task.id}`, title: task.title, detail: task.dueAt < today ? 'Aufgabe überfällig' : task.dueAt === today ? 'Heute fällig' : 'Morgen fällig', date: task.dueAt, route: '/aufgaben', severity: task.dueAt < today ? 'overdue' : task.dueAt === today ? 'soon' : 'upcoming' });
  for (const task of household) if (!task.completedAt && task.dueAt && task.dueAt <= plusDays(now, 7)) reminders.push({ id: `home:${task.id}`, title: task.title, detail: task.dueAt < today ? 'Haushaltsaufgabe überfällig' : `Haushalt · ${task.dueAt === today ? 'heute' : task.dueAt}`, date: task.dueAt, route: '/haushalt', severity: task.dueAt < today ? 'overdue' : task.dueAt <= plusDays(now, 2) ? 'soon' : 'upcoming' });
  for (const event of events) {
    const eventDay = event.allDay ? event.startAt : dayKey(new Date(event.startAt));
    if (eventDay >= today && eventDay <= plusDays(now, 7)) reminders.push({ id: `event:${event.id}`, title: event.title, detail: eventDay === today ? 'Termin heute' : eventDay === plusDays(now, 1) ? 'Termin morgen' : `Termin · ${eventDay}`, date: eventDay, route: '/kalender', severity: eventDay <= plusDays(now, 1) ? 'soon' : 'upcoming' });
  }
  for (const contract of contracts) {
    const date = contract.renewalAt ?? contract.endsAt;
    if (!date) continue;
    const notice = new Date(`${date}T12:00:00`); notice.setDate(notice.getDate() - contract.noticeDays);
    const noticeDay = dayKey(notice);
    if (noticeDay >= today && noticeDay <= plusDays(now, 30)) reminders.push({ id: `contract:${contract.id}`, title: contract.name, detail: `Kündigungsfrist · ${noticeDay}`, date: noticeDay, route: '/vertraege', severity: noticeDay <= plusDays(now, 7) ? 'soon' : 'upcoming' });
  }
  for (const device of devices) if (device.warrantyEndAt && device.warrantyEndAt >= today && device.warrantyEndAt <= plusDays(now, 30)) reminders.push({ id: `warranty:${device.id}`, title: device.name, detail: `Garantie läuft ab · ${device.warrantyEndAt}`, date: device.warrantyEndAt, route: '/geraete', severity: device.warrantyEndAt <= plusDays(now, 7) ? 'soon' : 'upcoming' });
  await db.documents.toCollection().each(document => {
    if (document.expiresAt && document.expiresAt >= today && document.expiresAt <= plusDays(now, 30)) reminders.push({ id: `document:${document.id}`, title: document.name, detail: `Dokument läuft ab · ${document.expiresAt}`, date: document.expiresAt, route: '/dokumente', severity: document.expiresAt <= plusDays(now, 7) ? 'soon' : 'upcoming' });
  });
  return reminders.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}
