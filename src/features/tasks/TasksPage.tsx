import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, ChevronDown, Circle, Plus, Search, Trash2 } from 'lucide-react';
import { db, type Task } from '../../data/database';
import { useSearchParams } from 'react-router-dom';
import { filterTasks, getTaskCounts, type TaskFilter } from './taskFilters';

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = async () => setTasks(await db.tasks.orderBy('createdAt').reverse().toArray());
  useEffect(() => { void refresh(); }, []);

  const visible = useMemo(() => filterTasks(tasks, filter, query), [tasks, filter, query]);
  const counts = useMemo(() => getTaskCounts(tasks), [tasks]);

  const resetForm = () => { setTitle(''); setDueAt(''); setPriority('medium'); setEditing(null); setAdding(false); setError(''); };
  useEffect(() => { if (searchParams.get('new') === '1') { resetForm(); setAdding(true); setSearchParams(current => { current.delete('new'); return current; }, { replace: true }); } }, [searchParams, setSearchParams]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) { setError('Gib deiner Aufgabe einen Namen.'); return; }
    const timestamp = new Date().toISOString();
    if (editing) {
      const old = await db.tasks.get(editing);
      if (old) await db.tasks.put({ ...old, title: cleanTitle, dueAt: dueAt || null, priority, updatedAt: timestamp });
    } else {
      await db.tasks.add({ id: crypto.randomUUID(), title: cleanTitle, notes: '', dueAt: dueAt || null, priority, completedAt: null, createdAt: timestamp, updatedAt: timestamp });
    }
    await refresh(); resetForm();
  };

  const toggle = async (task: Task) => {
    await db.tasks.update(task.id, { completedAt: task.completedAt ? null : new Date().toISOString(), updatedAt: new Date().toISOString() });
    await refresh();
  };
  const edit = (task: Task) => { setEditing(task.id); setTitle(task.title); setDueAt(task.dueAt ?? ''); setPriority(task.priority); setAdding(true); };
  const remove = async (task: Task) => { await db.tasks.delete(task.id); await refresh(); };
  const filters: { id: TaskFilter; label: string }[] = [
    { id: 'all', label: 'Alle offen' }, { id: 'today', label: 'Heute' }, { id: 'week', label: 'Diese Woche' }, { id: 'overdue', label: 'Überfällig' }, { id: 'done', label: 'Erledigt' },
  ];

  return <section className="tasks-page">
    <div className="welcome-line"><div><p className="eyebrow">DEIN ALLTAG</p><h1>Aufgaben</h1><p className="subheading">Ein Schritt nach dem anderen.</p></div><button className="button primary" onClick={() => { resetForm(); setAdding(true); }}><Plus size={15}/>Neue Aufgabe</button></div>
    <div className="task-toolbar"><div className="task-filters">{filters.map(item => <button key={item.id} className={`task-filter ${filter === item.id ? 'selected' : ''}`} onClick={() => setFilter(item.id)}>{item.label}<span>{counts[item.id]}</span></button>)}</div><label className="task-search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Aufgaben durchsuchen"/></label></div>
    {adding && <form className="task-form" onSubmit={submit}><div className="task-form-title"><b>{editing ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</b><button type="button" className="text-button" onClick={resetForm}>Schließen</button></div><input autoFocus maxLength={140} value={title} onChange={e => setTitle(e.target.value)} placeholder="Was möchtest du erledigen?" aria-label="Aufgabenname"/><div className="task-form-controls"><label>Fällig am<input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}/></label><label>Priorität<select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}><option value="low">Niedrig</option><option value="medium">Normal</option><option value="high">Hoch</option></select></label><button className="button primary" type="submit">{editing ? 'Änderungen speichern' : 'Aufgabe hinzufügen'}</button></div>{error && <p className="form-error">{error}</p>}</form>}
    {visible.length ? <div className="task-list">{visible.map(task => <article className={`task-row ${task.completedAt ? 'completed' : ''}`} key={task.id}><button className="task-check" aria-label={task.completedAt ? 'Als offen markieren' : 'Als erledigt markieren'} onClick={() => void toggle(task)}>{task.completedAt ? <Check size={14}/> : <Circle size={17}/>}</button><button className="task-main" onClick={() => edit(task)}><span>{task.title}</span><small>{task.dueAt ? `Fällig ${new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'short'}).format(new Date(`${task.dueAt}T12:00:00`))}` : 'Kein Fälligkeitsdatum'}</small></button><span className={`priority-badge ${task.priority}`}>{task.priority === 'high' ? 'Hoch' : task.priority === 'low' ? 'Niedrig' : 'Normal'}</span><button className="icon-button task-delete" aria-label={`Aufgabe ${task.title} löschen`} onClick={() => void remove(task)}><Trash2 size={15}/></button></article>)}</div> : <div className="task-empty"><div className="task-empty-icon"><Check size={19}/></div><h2>{query ? 'Keine passenden Aufgaben' : filter === 'done' ? 'Noch nichts abgehakt' : 'Hier ist noch Platz'}</h2><p>{query ? 'Passe deine Suche an und versuche es erneut.' : filter === 'overdue' ? 'Du bist auf dem Laufenden.' : 'Füge eine Aufgabe hinzu, damit du sie hier wiederfindest.'}</p>{!query && filter !== 'done' && <button className="button" onClick={() => { resetForm(); setAdding(true); }}><Plus size={14}/>Aufgabe hinzufügen</button>}</div>}
    <div className="task-list-footer">{visible.length} {visible.length === 1 ? 'Aufgabe' : 'Aufgaben'}{filter === 'all' ? ' offen' : ''}<ChevronDown size={14}/></div>
  </section>;
}
