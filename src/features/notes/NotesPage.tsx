import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Archive, Heart, Plus, Search, StickyNote, Tag, Trash2 } from 'lucide-react';
import { db, type Note } from '../../data/database';
import { useSearchParams } from 'react-router-dom';

type View = 'all' | 'favorites' | 'archive';
const noteCategories = ['Persönlich', 'Ideen', 'Familie', 'Arbeit', 'Haushalt', 'Sonstiges'];

export default function NotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<View>('all');
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState<Note | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Persönlich');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => setNotes(await db.notes.orderBy('updatedAt').reverse().toArray());
  useEffect(() => { void refresh(); }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return notes.filter(note => {
      if (view === 'archive' ? !note.archived : note.archived) return false;
      if (view === 'favorites' && !note.favorite) return false;
      return !term || `${note.title} ${note.content} ${note.category} ${note.tags.join(' ')}`.toLocaleLowerCase().includes(term);
    });
  }, [notes, view, query]);

  const startNew = () => { setCurrent(null); setIsNew(true); setTitle(''); setContent(''); setCategory('Persönlich'); setTags(''); setError(''); };
  useEffect(() => { if (searchParams.get('new') === '1') { startNew(); setSearchParams(current => { current.delete('new'); return current; }, { replace: true }); } }, [searchParams, setSearchParams]);
  const open = (note: Note) => { setCurrent(note); setIsNew(false); setTitle(note.title); setContent(note.content); setCategory(note.category); setTags(note.tags.join(', ')); setError(''); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() && !content.trim()) { setError('Schreibe einen Titel oder einen Gedanken auf.'); return; }
    const now = new Date().toISOString(); const cleanTags = [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))];
    const savedId = current?.id ?? crypto.randomUUID();
    if (current) await db.notes.put({ ...current, title: title.trim() || 'Ohne Titel', content: content.trim(), category, tags: cleanTags, updatedAt: now });
    else await db.notes.add({ id: savedId, title: title.trim() || 'Ohne Titel', content: content.trim(), category, tags: cleanTags, favorite: false, archived: false, createdAt: now, updatedAt: now });
    setError(''); await refresh();
    if (isNew) { setIsNew(false); const saved = await db.notes.get(savedId); if (saved) open(saved); }
    else if (current) { const saved = await db.notes.get(current.id); if (saved) open(saved); }
  };
  const toggle = async (note: Note, field: 'favorite' | 'archived') => {
    const next = !note[field]; const updatedAt = new Date().toISOString();
    if (field === 'favorite') await db.notes.update(note.id, { favorite: next, updatedAt });
    else await db.notes.update(note.id, { archived: next, updatedAt });
    if (current?.id === note.id) setCurrent({ ...note, [field]: next });
    await refresh();
  };
  const remove = async (note: Note) => { await db.notes.delete(note.id); if (current?.id === note.id) { setCurrent(null); setIsNew(false); } await refresh(); };

  return <section className="notes-page">
    <div className="welcome-line"><div><p className="eyebrow">GEDANKEN FESTHALTEN</p><h1>Notizen</h1><p className="subheading">Ein guter Ort für alles, was du behalten möchtest.</p></div><button className="button primary" onClick={startNew}><Plus size={15}/>Neue Notiz</button></div>
    <div className="notes-toolbar"><div className="notes-tabs"><button className={view === 'all' ? 'selected' : ''} onClick={() => setView('all')}>Alle <span>{notes.filter(note => !note.archived).length}</span></button><button className={view === 'favorites' ? 'selected' : ''} onClick={() => setView('favorites')}>Favoriten <span>{notes.filter(note => note.favorite && !note.archived).length}</span></button><button className={view === 'archive' ? 'selected' : ''} onClick={() => setView('archive')}>Archiv <span>{notes.filter(note => note.archived).length}</span></button></div><label className="notes-search"><Search size={14}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Notizen durchsuchen"/></label></div>
    <div className="notes-layout"><aside className="notes-list">{visible.map(note => <button key={note.id} className={`note-list-item ${current?.id === note.id ? 'selected' : ''}`} onClick={() => open(note)}><span className="note-list-heading"><b>{note.title}</b>{note.favorite && <Heart size={12} fill="currentColor"/>}</span><small>{note.category} · {new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' }).format(new Date(note.updatedAt))}</small><span className="note-preview-text">{note.content || note.tags.map(tag => `#${tag}`).join(' ') || 'Noch kein Inhalt'}</span></button>)}{!visible.length && <div className="notes-list-empty">{query ? 'Keine passenden Notizen.' : 'Hier erscheinen deine Notizen.'}</div>}</aside>
      {current || isNew ? <form className="note-editor" onSubmit={save}><div className="note-editor-top"><label className="note-title-input"><span className="eyebrow">{isNew ? 'NEUE NOTIZ' : 'NOTIZ'}</span><input autoFocus value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Titel deiner Notiz"/></label><div className="note-editor-actions">{current && <><button type="button" className={`icon-button ${current.favorite ? 'note-favorite-active' : ''}`} title={current.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'} onClick={() => void toggle(current, 'favorite')}><Heart size={16}/></button><button type="button" className="icon-button" title={current.archived ? 'Aus Archiv holen' : 'Archivieren'} onClick={() => void toggle(current, 'archived')}><Archive size={16}/></button><button type="button" className="icon-button" title="Notiz löschen" onClick={() => void remove(current)}><Trash2 size={15}/></button></>}<button className="button primary" type="submit">Speichern</button></div></div><div className="note-meta-fields"><label>Kategorie<select value={category} onChange={e => setCategory(e.target.value)}>{noteCategories.map(value => <option key={value}>{value}</option>)}</select></label><label><Tag size={13}/>Tags<input value={tags} onChange={e => setTags(e.target.value)} placeholder="Kommagetrennt"/></label></div><textarea className="note-content" value={content} onChange={e => setContent(e.target.value)} placeholder="Schreib einfach los …" maxLength={12000}/>{error && <p className="form-error">{error}</p>}<div className="note-editor-footer">{current ? `Zuletzt geändert ${new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(current.updatedAt))}` : 'Deine Notiz wird lokal gespeichert.'}<span>{content.length} / 12000</span></div></form> : <div className="note-placeholder"><div className="task-empty-icon"><StickyNote size={19}/></div><h2>Wähle eine Notiz aus</h2><p>Oder erstelle eine neue, um einen Gedanken festzuhalten.</p><button className="button" onClick={startNew}><Plus size={14}/>Neue Notiz</button></div>}</div>
  </section>;
}
