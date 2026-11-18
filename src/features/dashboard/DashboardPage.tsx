import { useEffect, useState } from 'react';
import { CalendarDays, CheckSquare, ChevronRight, Clock3, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, type CalendarEvent, type Task, type TransactionRecord } from '../../data/database';

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const money = (cents: number, currency: string) => new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(cents / 100);

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [currency, setCurrency] = useState('EUR');
  const [ready, setReady] = useState(false);
  const now = new Date();
  const today = dayKey(now);
  const month = today.slice(0, 7);

  useEffect(() => {
    let active = true;
    void Promise.all([
      db.tasks.toArray(), db.events.toArray(), db.transactions.toArray(),
      db.budgets.where('month').equals(month).first(), db.settings.get('app'),
    ]).then(([taskRows, eventRows, transactionRows, currentBudget, settings]) => {
      if (!active) return;
      setTasks(taskRows); setEvents(eventRows); setTransactions(transactionRows);
      setBudget(currentBudget?.amountCents ?? null); setCurrency(settings?.currency || 'EUR'); setReady(true);
    });
    return () => { active = false; };
  }, [month]);

  const openTasks = tasks.filter(task => !task.completedAt).sort((a, b) => (a.dueAt || '9999').localeCompare(b.dueAt || '9999')).slice(0, 4);
  const upcoming = events.filter(event => (event.allDay ? event.startAt : dayKey(new Date(event.startAt))) >= today)
    .sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 4);
  const expenses = transactions.filter(item => item.kind === 'expense' && item.date.startsWith(month)).reduce((sum, item) => sum + item.amountCents, 0);
  const dateLabel = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' }).format(now);
  const formatDay = (value: string) => value === today ? 'Heute' : value === dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)) ? 'Morgen' : new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));

  return <section className="dashboard-page">
    <div className="welcome-line"><div><p className="eyebrow">{new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(now).toLocaleUpperCase('de-DE')}</p><h1>Schön, dass du da bist<span className="wave">✳</span></h1><p className="subheading">Hier ist dein Überblick für heute.</p></div><span className="date-chip"><CalendarDays size={15}/>{dateLabel}</span></div>
    <section className="empty-hero"><div className="hero-decoration decor-one"/><div className="hero-decoration decor-two"/><div className="hero-content"><div className="hero-icon"><Clock3 size={19}/></div><p className="eyebrow">DEIN PLATZ. DEIN RHYTHMUS.</p><h2>{openTasks.length ? 'Ein Schritt nach dem anderen.' : 'Alles beginnt mit einem kleinen Schritt.'}</h2><p>{openTasks.length ? `Du hast ${openTasks.length} offene ${openTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'} im Blick.` : 'Füge eine Aufgabe oder einen Termin hinzu. LIFEHUB hilft dir, den Überblick zu behalten.'}</p><Link className="button primary" to="/aufgaben"><CheckSquare size={16}/>Aufgaben ansehen</Link></div><div className="hero-bottom"><span><span className="live-dot"/>Deine Daten werden sicher auf diesem Gerät gespeichert</span><Link className="text-button" to="/einstellungen">Einstellungen <ChevronRight size={14}/></Link></div></section>
    <div className="section-heading"><div><h3>Dein Überblick</h3><p>Das Wichtigste an einem Ort.</p></div></div>
    <section className="dashboard-grid">
      <article className="dashboard-card"><div className="dashboard-card-head"><span className="widget-icon purple"><CheckSquare size={16}/></span><Link to="/aufgaben">Alle Aufgaben <ChevronRight size={14}/></Link></div><h2>Offene Aufgaben <b>{ready ? tasks.filter(task => !task.completedAt).length : '—'}</b></h2>{!ready ? <p className="dashboard-empty">Wird geladen …</p> : openTasks.length ? <ul>{openTasks.map(task => <li key={task.id}><span className="dashboard-dot"/><span>{task.title}</span><small>{task.dueAt ? formatDay(task.dueAt) : 'Ohne Datum'}</small></li>)}</ul> : <p className="dashboard-empty">Keine offenen Aufgaben. Gut gemacht!</p>}</article>
      <article className="dashboard-card"><div className="dashboard-card-head"><span className="widget-icon blue"><CalendarDays size={16}/></span><Link to="/kalender">Kalender öffnen <ChevronRight size={14}/></Link></div><h2>Als Nächstes</h2>{!ready ? <p className="dashboard-empty">Wird geladen …</p> : upcoming.length ? <ul>{upcoming.map(event => <li key={event.id}><span className="dashboard-dot blue-dot"/><span>{event.title}</span><small>{formatDay(event.allDay ? event.startAt : dayKey(new Date(event.startAt)))}</small></li>)}</ul> : <p className="dashboard-empty">Keine kommenden Termine eingetragen.</p>}</article>
      <article className="dashboard-card"><div className="dashboard-card-head"><span className="widget-icon green"><Wallet size={16}/></span><Link to="/finanzen">Finanzen öffnen <ChevronRight size={14}/></Link></div><h2>Monatsbudget</h2>{!ready ? <p className="dashboard-empty">Wird geladen …</p> : budget === null ? <p className="dashboard-empty">Noch kein Budget festgelegt.</p> : <><div className="budget-numbers"><strong>{money(Math.max(0, budget - expenses), currency)}</strong><span>übrig von {money(budget, currency)}</span></div><div className="budget-track"><i style={{ width: `${budget ? Math.min(100, expenses / budget * 100) : 100}%` }}/></div><p className="dashboard-empty">{money(expenses, currency)} Ausgaben in diesem Monat</p></>}</article>
    </section>
    <footer className="page-footer"><span>Mit Ruhe organisiert.</span><span>Deine Daten bleiben auf deinem Gerät.</span></footer>
  </section>;
}