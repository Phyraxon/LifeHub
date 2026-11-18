import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Circle, Plus, Sparkles, Trash2 } from 'lucide-react';
import { db, type HouseholdRecurrence, type HouseholdTask, type Room } from '../../data/database';
import { advanceDueDate } from './recurrence';
import { deleteSyncedRecords } from '../sync/localDeletes';

type Filter = 'open' | 'done';
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const recurrenceNames: Record<HouseholdRecurrence, string> = { none: 'Einmalig', daily: 'Täglich', weekly: 'Wöchentlich', monthly: 'Monatlich' };

export default function HouseholdPage() {
  const [tasks, setTasks] = useState<HouseholdTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [roomFilter, setRoomFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [roomId, setRoomId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [recurrence, setRecurrence] = useState<HouseholdRecurrence>('none');
  const [notes, setNotes] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    const [savedTasks, savedRooms] = await Promise.all([
      db.householdTasks.orderBy('createdAt').reverse().toArray(),
      db.rooms.orderBy('name').toArray(),
    ]);
    setTasks(savedTasks); setRooms(savedRooms);
  };
  useEffect(() => { void refresh(); }, []);

  const visible = useMemo(() => tasks.filter(task => {
    if (filter === 'done' ? !task.completedAt : !!task.completedAt) return false;
    return roomFilter === 'all' || task.roomId === roomFilter;
  }), [tasks, filter, roomFilter]);

  const resetForm = () => { setAdding(false); setEditingId(null); setTitle(''); setRoomId(''); setDueAt(''); setRecurrence('none'); setNotes(''); setError(''); };
  const openEdit = (task: HouseholdTask) => { setEditingId(task.id); setTitle(task.title); setRoomId(task.roomId ?? ''); setDueAt(task.dueAt ?? ''); setRecurrence(task.recurrence); setNotes(task.notes); setAdding(true); setError(''); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) { setError('Bitte gib der Aufgabe einen Namen.'); return; }
    if (recurrence !== 'none' && !dueAt) { setError('Wiederkehrende Aufgaben brauchen ein Fälligkeitsdatum.'); return; }
    const now = new Date().toISOString();
    if (editingId) {
      const old = await db.householdTasks.get(editingId);
      if (old) await db.householdTasks.put({ ...old, title: clean, roomId: roomId || null, dueAt: dueAt || null, recurrence, notes: notes.trim(), updatedAt: now });
    } else {
      await db.householdTasks.add({ id: crypto.randomUUID(), title: clean, roomId: roomId || null, dueAt: dueAt || null, recurrence, completedAt: null, lastCompletedAt: null, notes: notes.trim(), createdAt: now, updatedAt: now });
    }
    resetForm(); await refresh();
  };

  const toggleDone = async (task: HouseholdTask) => {
    const now = new Date(); const timestamp = now.toISOString();
    if (task.completedAt) {
      await db.householdTasks.update(task.id, { completedAt: null, updatedAt: timestamp });
    } else if (task.recurrence !== 'none' && task.dueAt) {
      await db.householdTasks.update(task.id, { dueAt: advanceDueDate(task.dueAt, task.recurrence, now), lastCompletedAt: timestamp, updatedAt: timestamp });
    } else {
      await db.householdTasks.update(task.id, { completedAt: timestamp, lastCompletedAt: timestamp, updatedAt: timestamp });
    }
    await refresh();
  };
  const addRoom = async (event: FormEvent) => {
    event.preventDefault(); const clean = newRoom.trim(); if (!clean) return;
    const now = new Date().toISOString(); const id = crypto.randomUUID();
    await db.rooms.add({ id, name: clean, createdAt: now, updatedAt: now });
    setNewRoom(''); setAddingRoom(false); await refresh(); setRoomId(id);
  };
  const removeRoom = async (room: Room) => {
    if (await db.householdTasks.where('roomId').equals(room.id).count()) { setError(`„${room.name}“ hat noch verknüpfte Aufgaben. Weise sie zuerst einem anderen Raum zu.`); return; }
    await deleteSyncedRecords([{ table: 'rooms', ids: [room.id] }]); await refresh();
  };
  const removeTask = async (id: string) => { await deleteSyncedRecords([{ table: 'householdTasks', ids: [id] }]); await refresh(); };
  const roomName = (id: string | null) => id ? rooms.find(room => room.id === id)?.name ?? 'Raum entfernt' : 'Kein Raum';

  return <section className="household-page">
    <div className="welcome-line"><div><p className="eyebrow">ZUSAMMEN ZUHAUSE</p><h1>Haushalt</h1><p className="subheading">Ein Zuhause, das sich gut anfühlt.</p></div><button className="button primary" onClick={() => { resetForm(); setAdding(true); }}><Plus size={15}/>Aufgabe hinzufügen</button></div>
    <div className="household-summary"><div className="household-summary-icon"><Sparkles size={17}/></div><div><b>{tasks.filter(task => !task.completedAt).length} Aufgaben im Überblick</b><span>Regelmäßiges wird nach dem Erledigen automatisch neu eingeplant.</span></div><button className="text-button" onClick={() => setAddingRoom(true)}>Räume verwalten <Plus size={13}/></button></div>
    <div className="household-toolbar"><div className="household-tabs"><button className={filter === 'open' ? 'selected' : ''} onClick={() => setFilter('open')}>Offen <span>{tasks.filter(task => !task.completedAt).length}</span></button><button className={filter === 'done' ? 'selected' : ''} onClick={() => setFilter('done')}>Erledigt <span>{tasks.filter(task => task.completedAt).length}</span></button></div><select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} aria-label="Nach Raum filtern"><option value="all">Alle Räume</option>{rooms.map(room => <option value={room.id} key={room.id}>{room.name}</option>)}</select></div>
    {adding && <form className="household-form" onSubmit={save}><div className="task-form-title"><b>{editingId ? 'Aufgabe bearbeiten' : 'Neue Haushaltsaufgabe'}</b><button className="text-button" type="button" onClick={resetForm}>Schließen</button></div><input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="z. B. Filter der Spülmaschine reinigen"/><div className="household-form-fields"><label>Raum<select value={roomId} onChange={e => setRoomId(e.target.value)}><option value="">Kein Raum</option>{rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label><label>Fällig am<input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}/></label><label>Wiederholen<select value={recurrence} onChange={e => setRecurrence(e.target.value as HouseholdRecurrence)}><option value="none">Einmalig</option><option value="daily">Täglich</option><option value="weekly">Wöchentlich</option><option value="monthly">Monatlich</option></select></label></div><label className="household-note">Notiz<textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} maxLength={600}/></label>{error && <p className="form-error">{error}</p>}<div className="household-submit"><button className="button primary" type="submit">{editingId ? 'Speichern' : 'Aufgabe erstellen'}</button></div></form>}
    {error && !adding && <p className="form-error">{error}</p>}
    {visible.length ? <div className="household-list">{visible.map(task => { const overdue = task.dueAt && task.dueAt < dateKey(new Date()) && !task.completedAt; return <article className={`household-task ${task.completedAt ? 'completed' : ''}`} key={task.id}><button className={`household-check ${task.completedAt ? 'done' : ''}`} aria-label={task.completedAt ? 'Als offen markieren' : 'Als erledigt markieren'} onClick={() => void toggleDone(task)}>{task.completedAt ? <Check size={13}/> : <Circle size={17}/>}</button><button className="household-task-main" onClick={() => openEdit(task)}><b>{task.title}</b><small>{roomName(task.roomId)}{task.dueAt ? ` · ${overdue ? 'Überfällig: ' : 'Fällig: '}${new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' }).format(new Date(`${task.dueAt}T12:00:00`))}` : ''}</small></button>{task.recurrence !== 'none' && <span className="recurrence-pill">{recurrenceNames[task.recurrence]}</span>}<button className="icon-button" title="Aufgabe löschen" aria-label={`${task.title} löschen`} onClick={() => void removeTask(task.id)}><Trash2 size={14}/></button></article>; })}</div> : <div className="task-empty"><div className="task-empty-icon"><Sparkles size={19}/></div><h2>{filter === 'done' ? 'Noch nichts erledigt' : 'Hier ist noch nichts geplant'}</h2><p>{filter === 'done' ? 'Erledigte Aufgaben erscheinen hier.' : 'Erstelle eine Aufgabe für deinen Haushalt.'}</p>{filter === 'open' && <button className="button" onClick={() => { resetForm(); setAdding(true); }}><Plus size={14}/>Aufgabe hinzufügen</button>}</div>}
    {addingRoom && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setAddingRoom(false)}><form className="quick-modal" onSubmit={addRoom}><div className="modal-title-row"><div><p className="eyebrow">DEIN ZUHAUSE</p><h2>Räume</h2></div></div><div className="room-list">{rooms.map(room => <div className="room-row" key={room.id}><span>{room.name}</span><button type="button" className="icon-button" onClick={() => void removeRoom(room)} title="Raum löschen"><Trash2 size={14}/></button></div>)}</div><label className="calendar-field">Raum hinzufügen<input autoFocus maxLength={50} value={newRoom} onChange={e => setNewRoom(e.target.value)} placeholder="z. B. Küche"/></label>{error && <p className="form-error">{error}</p>}<div className="calendar-form-actions"><button type="button" className="button" onClick={() => setAddingRoom(false)}>Schließen</button><button type="submit" className="button primary">Raum hinzufügen</button></div></form></div>}
  </section>;
}
