import { useEffect, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckSquare, FileText, Search, ShoppingBasket, StickyNote, Wallet, X } from 'lucide-react';
import { db } from '../../data/database';

interface SearchResult { id: string; title: string; detail: string; route: string; kind: string }
const historyKey = 'lifehub-search-history';

export default function SearchDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(historyKey) ?? '[]') as string[]; } catch { return []; } });

  useEffect(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) { setResults([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(() => { void search(term).then(found => { if (!cancelled) setResults(found); }); }, 120);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    const handle = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  const search = async (term: string): Promise<SearchResult[]> => {
    const [tasks, events, contracts, devices, notes, items] = await Promise.all([
      db.tasks.orderBy('createdAt').reverse().limit(500).toArray(),
      db.events.orderBy('startAt').reverse().limit(500).toArray(),
      db.contracts.orderBy('createdAt').reverse().limit(300).toArray(),
      db.devices.orderBy('createdAt').reverse().limit(300).toArray(),
      db.notes.orderBy('updatedAt').reverse().limit(500).toArray(),
      db.shoppingItems.orderBy('createdAt').reverse().limit(500).toArray(),
    ]);
    const matches = (value: string) => value.toLocaleLowerCase().includes(term);
    const documentResults: SearchResult[] = [];
    await db.documents.orderBy('createdAt').reverse().limit(500).each(doc => {
      if (matches(`${doc.name} ${doc.description} ${doc.category} ${doc.tags.join(' ')}`)) documentResults.push({ id: doc.id, title: doc.name, detail: `Dokument · ${doc.category}`, route: '/dokumente', kind: 'document' });
    });
    return [
      ...tasks.filter(task => matches(`${task.title} ${task.notes}`)).map(task => ({ id: task.id, title: task.title, detail: `Aufgabe${task.dueAt ? ` · ${task.dueAt}` : ''}`, route: '/aufgaben', kind: 'task' })),
      ...events.filter(event => matches(`${event.title} ${event.category} ${event.notes}`)).map(event => ({ id: event.id, title: event.title, detail: `Termin · ${event.allDay ? event.startAt : event.startAt.slice(0, 10)}`, route: '/kalender', kind: 'event' })),
      ...documentResults,
      ...contracts.filter(contract => matches(`${contract.name} ${contract.provider} ${contract.notes}`)).map(contract => ({ id: contract.id, title: contract.name, detail: `Vertrag · ${contract.provider}`, route: '/vertraege', kind: 'contract' })),
      ...devices.filter(device => matches(`${device.name} ${device.manufacturer} ${device.serialNumber} ${device.notes}`)).map(device => ({ id: device.id, title: device.name, detail: `Gerät · ${device.manufacturer}`, route: '/geraete', kind: 'device' })),
      ...notes.filter(note => matches(`${note.title} ${note.content} ${note.tags.join(' ')}`)).map(note => ({ id: note.id, title: note.title, detail: `Notiz · ${note.category}`, route: '/notizen', kind: 'note' })),
      ...items.filter(item => matches(`${item.name} ${item.category}`)).map(item => ({ id: item.id, title: item.name, detail: `Einkauf · ${item.category}`, route: '/einkaeufe', kind: 'shopping' })),
    ].slice(0, 24);
  };

  const submit = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || !query.trim()) return;
    const next = [query.trim(), ...history.filter(entry => entry.toLocaleLowerCase() !== query.trim().toLocaleLowerCase())].slice(0, 8);
    setHistory(next); localStorage.setItem(historyKey, JSON.stringify(next));
  };
  const go = (result: SearchResult) => { onClose(); navigate(result.route); };
  const chooseHistory = (item: string) => setQuery(item);
  const iconFor = (kind: string) => kind === 'task' ? <CheckSquare size={15}/> : kind === 'event' ? <CalendarDays size={15}/> : kind === 'shopping' ? <ShoppingBasket size={15}/> : kind === 'contract' || kind === 'device' ? <Wallet size={15}/> : kind === 'note' ? <StickyNote size={15}/> : <FileText size={15}/>;

  return <div className="modal-backdrop search-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="command-modal search-modal"><div className="command-input"><Search size={18}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={submit} placeholder="Aufgaben, Termine, Dokumente und mehr …"/><kbd>ESC</kbd><button className="icon-button" onClick={onClose} aria-label="Suche schließen"><X size={17}/></button></div>{query.trim() ? <div className="search-results">{results.length ? results.map(result => <button key={`${result.kind}-${result.id}`} className="search-result" onClick={() => go(result)}><span>{iconFor(result.kind)}</span><div><b>{result.title}</b><small>{result.detail}</small></div><ArrowRight size={14}/></button>) : <div className="command-empty"><Search size={19}/><span>Keine Treffer. Versuche einen anderen Suchbegriff.</span></div>}</div> : <div className="search-start"><div className="command-empty"><Search size={19}/><span>Suche über deine LIFEHUB-Module hinweg.</span></div>{history.length > 0 && <div className="search-history"><b>Zuletzt gesucht</b>{history.map(item => <button key={item} onClick={() => chooseHistory(item)}>{item}</button>)}</div>}</div>}<div className="command-hint"><span>Enter speichert die Suche · Esc schließt</span><span>Suche nur auf diesem Gerät</span></div></section></div>;
}
