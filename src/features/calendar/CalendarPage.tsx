import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Download, Plus, Upload, X } from 'lucide-react';
import { db, type CalendarEvent } from '../../data/database';
import { exportIcs, importIcs } from './ics';

type View = 'day' | 'week' | 'month' | 'agenda';
const keyOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const toLocalInput = (iso: string) => { const date = new Date(iso); return `${keyOf(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };
const fromLocalInput = (value: string) => new Date(value).toISOString();
const eventDay = (event: CalendarEvent) => event.allDay ? event.startAt : keyOf(new Date(event.startAt));
const startOfWeek = (date: Date) => { const result = new Date(date.getFullYear(), date.getMonth(), date.getDate()); result.setDate(result.getDate() - ((result.getDay() + 6) % 7)); return result; };

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => keyOf(new Date()));
  const [view, setView] = useState<View>('month');
  const [editor, setEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(keyOf(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState('Persönlich');
  const [color, setColor] = useState('#9b7bef');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = async () => setEvents(await db.events.orderBy('startAt').toArray());
  useEffect(() => { void refresh(); }, []);

  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthStart = startOfWeek(firstOfMonth);
  const monthDays = Array.from({ length: 42 }, (_, index) => { const day = new Date(monthStart); day.setDate(day.getDate() + index); return day; });
  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, index) => { const day = new Date(weekStart); day.setDate(day.getDate() + index); return day; });

  const selectedEvents = useMemo(() => events.filter(event => eventDay(event) === selectedDay), [events, selectedDay]);
  const agendaEvents = useMemo(() => events.filter(event => eventDay(event) >= keyOf(new Date()) && eventDay(event) <= keyOf(new Date(Date.now() + 60 * 86400000))), [events]);

  const openNew = (day = selectedDay) => { setEditingId(null); setTitle(''); setDate(day); setStartTime('09:00'); setEndTime('10:00'); setAllDay(false); setCategory('Persönlich'); setColor('#9b7bef'); setNotes(''); setError(''); setEditor(true); };
  const openEdit = (event: CalendarEvent) => { setEditingId(event.id); setTitle(event.title); setDate(event.allDay ? event.startAt : keyOf(new Date(event.startAt))); setStartTime(event.allDay ? '09:00' : toLocalInput(event.startAt).slice(11)); setEndTime(event.allDay ? '10:00' : toLocalInput(event.endAt).slice(11)); setAllDay(event.allDay); setCategory(event.category); setColor(event.color); setNotes(event.notes); setError(''); setEditor(true); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) { setError('Bitte gib dem Termin einen Titel.'); return; }
    const startAt = allDay ? date : fromLocalInput(`${date}T${startTime}`);
    const endAt = allDay ? date : fromLocalInput(`${date}T${endTime}`);
    if (!allDay && new Date(endAt) < new Date(startAt)) { setError('Das Ende muss nach dem Beginn liegen.'); return; }
    const now = new Date().toISOString();
    const record = { title: cleanTitle, startAt, endAt, allDay, category, color, notes: notes.trim(), updatedAt: now };
    if (editingId) {
      const old = await db.events.get(editingId);
      if (old) await db.events.put({ ...old, ...record });
    } else await db.events.add({ id: crypto.randomUUID(), ...record, createdAt: now });
    setSelectedDay(date); await refresh(); setEditor(false);
  };

  const removeEvent = async (id: string) => { await db.events.delete(id); await refresh(); };
  const changeCursor = (amount: number) => {
    const next = new Date(cursor);
    if (view === 'day') next.setDate(next.getDate() + amount);
    else if (view === 'week') next.setDate(next.getDate() + amount * 7);
    else if (view === 'agenda') next.setDate(next.getDate() + amount * 30);
    else { next.setDate(1); next.setMonth(next.getMonth() + amount); }
    setCursor(next); setSelectedDay(keyOf(next));
  };
  const navigateToday = () => { const now = new Date(); setCursor(now); setSelectedDay(keyOf(now)); };

  const downloadIcs = () => {
    const blob = new Blob([exportIcs(events)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'lifehub-kalender.ics'; anchor.click(); URL.revokeObjectURL(url);
  };
  const readIcs = async (file?: File) => {
    if (!file) return;
    try {
      const imported = importIcs(await file.text());
      await db.events.bulkAdd(imported.map(event => ({ ...event, id: crypto.randomUUID() })));
      await refresh();
    } catch { setError('Die Kalenderdatei konnte nicht gelesen werden.'); }
    if (importRef.current) importRef.current.value = '';
  };

  const heading = view === 'agenda'
    ? 'Kommende Termine'
    : view === 'day'
      ? new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${selectedDay}T12:00:00`))
      : view === 'week'
        ? `${new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' }).format(weekDays[0])} – ${new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }).format(weekDays[6])}`
        : new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(cursor);

  const eventRows = (items: CalendarEvent[]) => items.length ? items.map(event => <article className="calendar-event-row" key={event.id}><span className="event-color" style={{ background: event.color }}/><button className="event-row-main" onClick={() => openEdit(event)}><b>{event.title}</b><small>{event.allDay ? 'Ganztägig' : new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.startAt))} · {event.category}</small></button><button className="text-button event-remove" onClick={() => void removeEvent(event.id)} aria-label={`${event.title} löschen`}><X size={15}/></button></article>) : <div className="calendar-no-events">Keine Termine an diesem Tag.</div>;

  return <section className="calendar-page">
    <div className="welcome-line"><div><p className="eyebrow">DEIN ALLTAG</p><h1>Kalender</h1><p className="subheading">Mach Platz für das, was ansteht.</p></div><button className="button primary" onClick={() => openNew()}><Plus size={15}/>Neuer Termin</button></div>
    <div className="calendar-toolbar"><div className="calendar-title-controls"><button className="icon-button" onClick={() => changeCursor(-1)} aria-label="Zurück"><ChevronLeft size={17}/></button><button className="icon-button" onClick={() => changeCursor(1)} aria-label="Weiter"><ChevronRight size={17}/></button><button className="calendar-today" onClick={navigateToday}>Heute</button><h2>{heading}</h2></div><div className="calendar-actions"><div className="calendar-views">{(['day', 'week', 'month', 'agenda'] as View[]).map(item => <button className={view === item ? 'selected' : ''} key={item} onClick={() => setView(item)}>{item === 'day' ? 'Tag' : item === 'week' ? 'Woche' : item === 'month' ? 'Monat' : 'Agenda'}</button>)}</div><button className="icon-button calendar-transfer" title="ICS exportieren" onClick={downloadIcs}><Download size={16}/></button><button className="icon-button calendar-transfer" title="ICS importieren" onClick={() => importRef.current?.click()}><Upload size={16}/></button><input ref={importRef} hidden type="file" accept=".ics,text/calendar" onChange={e => void readIcs(e.target.files?.[0])}/></div></div>
    {view === 'month' && <div className="month-grid"><div className="weekday-row">{['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => <span key={day}>{day}</span>)}</div><div className="month-cells">{monthDays.map(day => { const key = keyOf(day); const dayEvents = events.filter(event => eventDay(event) === key); return <div className={`month-cell ${day.getMonth() !== cursor.getMonth() ? 'outside' : ''} ${key === selectedDay ? 'selected-day' : ''}`} key={key} onClick={() => setSelectedDay(key)}><button className={`day-number ${key === keyOf(new Date()) ? 'today' : ''}`} onClick={() => setSelectedDay(key)}>{day.getDate()}</button>{dayEvents.slice(0, 3).map(event => <button key={event.id} className="month-event" style={{ '--event-color': event.color } as CSSProperties} onClick={e => { e.stopPropagation(); openEdit(event); }}>{event.title}</button>)}{dayEvents.length > 3 && <small className="more-events">+{dayEvents.length - 3} weitere</small>}</div>; })}</div></div>}
    {view === 'week' && <div className="week-grid">{weekDays.map(day => { const key = keyOf(day); return <div className={`week-day ${key === selectedDay ? 'selected-day' : ''}`} key={key}><button className="week-day-title" onClick={() => { setSelectedDay(key); setView('day'); }}>{new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric' }).format(day)}</button>{events.filter(event => eventDay(event) === key).map(event => <button key={event.id} className="week-event" style={{ borderLeftColor: event.color }} onClick={() => openEdit(event)}>{event.title}</button>}<button className="week-add" onClick={() => openNew(key)}><Plus size={13}/></button></div>; })}</div>}
    {view === 'day' && <div className="calendar-event-list">{eventRows(selectedEvents)}<button className="calendar-add-inline" onClick={() => openNew(selectedDay)}><Plus size={14}/>Termin für diesen Tag</button></div>}
    {view === 'agenda' && <div className="agenda-list">{agendaEvents.length ? agendaEvents.map(event => <div className="agenda-day" key={event.id}><div className="agenda-date"><b>{new Intl.DateTimeFormat('de-DE', { day: '2-digit' }).format(new Date(eventDay(event) + 'T12:00:00'))}</b><span>{new Intl.DateTimeFormat('de-DE', { month: 'short', weekday: 'short' }).format(new Date(eventDay(event) + 'T12:00:00'))}</span></div>{eventRows([event])}</div>) : <div className="calendar-no-events">Keine Termine in den nächsten 60 Tagen.</div>}</div>}
    {view === 'month' && <div className="calendar-event-list month-selection"><div className="selected-date-title"><CalendarDays size={15}/>{new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${selectedDay}T12:00:00`))}</div>{eventRows(selectedEvents)}<button className="calendar-add-inline" onClick={() => openNew(selectedDay)}><Plus size={14}/>Termin hinzufügen</button></div>}
    {error && !editor && <p className="form-error">{error}</p>}
    {editor && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setEditor(false)}><form className="calendar-editor" onSubmit={submit}><div className="modal-title-row"><div><p className="eyebrow">KALENDER</p><h2>{editingId ? 'Termin bearbeiten' : 'Neuer Termin'}</h2></div><button type="button" className="icon-button" onClick={() => setEditor(false)}><X size={18}/></button></div><label className="calendar-field">Titel<input autoFocus maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="Worum geht es?"/></label><label className="calendar-field">Datum<input type="date" value={date} onChange={e => setDate(e.target.value)} required/></label><label className="all-day-check"><input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)}/>Ganztägiger Termin</label>{!allDay && <div className="calendar-time-fields"><label className="calendar-field">Beginn<input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}/></label><label className="calendar-field">Ende<input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}/></label></div>}<div className="calendar-time-fields"><label className="calendar-field">Kategorie<select value={category} onChange={e => setCategory(e.target.value)}><option>Persönlich</option><option>Familie</option><option>Arbeit</option><option>Gesundheit</option><option>Freizeit</option></select></label><label className="calendar-field">Farbe<select value={color} onChange={e => setColor(e.target.value)}><option value="#9b7bef">Violett</option><option value="#5b9ced">Blau</option><option value="#4dbd91">Grün</option><option value="#e5a04b">Orange</option><option value="#e36e83">Rosa</option></select></label></div><label className="calendar-field">Notiz<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={1200} placeholder="Optionale Details"/></label>{error && <p className="form-error">{error}</p>}<div className="calendar-form-actions"><button type="button" className="button" onClick={() => setEditor(false)}>Abbrechen</button><button type="submit" className="button primary">{editingId ? 'Änderungen sichern' : 'Termin speichern'}</button></div></form></div>}
  </section>;
}
