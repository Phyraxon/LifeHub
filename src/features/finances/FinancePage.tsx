import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2, Wallet } from 'lucide-react';
import { db, type SavingsGoal, type TransactionRecord } from '../../data/database';
import { parseMoneyToCents, summarizeTransactions } from './money';

const expenseCategories = ['Lebensmittel', 'Wohnen', 'Versicherungen', 'Mobilität', 'Freizeit', 'Gesundheit', 'Haushalt', 'Sonstiges'];
const incomeCategories = ['Gehalt', 'Nebeneinkommen', 'Rückerstattung', 'Sonstige Einnahmen'];
const money = (amountCents: number, currency: string) => new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amountCents / 100);
const monthNow = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; };
const todayKey = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };

export default function FinancePage() {
  const [month, setMonth] = useState(monthNow());
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [budgetCents, setBudgetCents] = useState<number | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [currency, setCurrency] = useState('EUR');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [kind, setKind] = useState<TransactionRecord['kind']>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(expenseCategories[0]);
  const [date, setDate] = useState(todayKey());
  const [budgetInput, setBudgetInput] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [depositInputs, setDepositInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const refresh = async () => {
    const [year, monthNumber] = month.split('-').map(Number);
    const from = `${month}-01`;
    const untilDate = new Date(year, monthNumber, 1);
    const until = `${untilDate.getFullYear()}-${String(untilDate.getMonth() + 1).padStart(2, '0')}-01`;
    const [savedTransactions, budget, savedGoals] = await Promise.all([
      db.transactions.where('date').between(from, until, true, false).toArray(),
      db.budgets.get(`budget-${month}`),
      db.savingsGoals.orderBy('createdAt').reverse().toArray(),
    ]);
    setTransactions(savedTransactions.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)));
    setBudgetCents(budget?.amountCents ?? null); setBudgetInput(budget ? String(budget.amountCents / 100).replace('.', ',') : ''); setGoals(savedGoals);
  };
  useEffect(() => { void refresh(); }, [month]);
  useEffect(() => { void db.settings.get('app').then(settings => { if (settings?.currency) setCurrency(settings.currency); }); }, []);

  const summary = useMemo(() => summarizeTransactions(transactions), [transactions]);
  const maxCategory = Math.max(1, ...summary.expenseByCategory.values());
  const categories = kind === 'expense' ? expenseCategories : incomeCategories;

  const saveTransaction = async (event: FormEvent) => {
    event.preventDefault();
    const clean = title.trim(); const cents = parseMoneyToCents(amount);
    if (!clean || !cents || !date) { setError('Bitte prüfe Name, Datum und Betrag.'); return; }
    const now = new Date().toISOString();
    await db.transactions.add({ id: crypto.randomUUID(), title: clean, date, kind, category, amountCents: cents, createdAt: now, updatedAt: now });
    setTitle(''); setAmount(''); setError(''); setShowTransactionForm(false); await refresh();
  };
  const removeTransaction = async (id: string) => { await db.transactions.delete(id); await refresh(); };
  const saveBudget = async (event: FormEvent) => {
    event.preventDefault(); const cents = parseMoneyToCents(budgetInput);
    if (cents === null) { setError('Bitte gib ein gültiges Budget ein.'); return; }
    const id = `budget-${month}`; const existing = await db.budgets.get(id); const now = new Date().toISOString();
    await db.budgets.put({ id, month, amountCents: cents, createdAt: existing?.createdAt ?? now, updatedAt: now });
    setError(''); await refresh();
  };
  const saveGoal = async (event: FormEvent) => {
    event.preventDefault(); const clean = goalTitle.trim(); const cents = parseMoneyToCents(goalTarget);
    if (!clean || cents === null || cents <= 0) { setError('Ein Sparziel braucht einen Namen und einen Zielbetrag größer als null.'); return; }
    const now = new Date().toISOString();
    await db.savingsGoals.add({ id: crypto.randomUUID(), title: clean, targetCents: cents, savedCents: 0, dueAt: null, createdAt: now, updatedAt: now });
    setGoalTitle(''); setGoalTarget(''); setError(''); await refresh();
  };
  const addSavings = async (goal: SavingsGoal) => {
    const cents = parseMoneyToCents(depositInputs[goal.id] ?? '');
    if (cents === null || cents <= 0) { setError('Bitte gib einen Sparbetrag größer als null ein.'); return; }
    await db.savingsGoals.update(goal.id, { savedCents: goal.savedCents + cents, updatedAt: new Date().toISOString() });
    setDepositInputs(current => ({ ...current, [goal.id]: '' })); setError(''); await refresh();
  };
  const removeGoal = async (id: string) => { await db.savingsGoals.delete(id); await refresh(); };

  return <section className="finance-page">
    <div className="welcome-line"><div><p className="eyebrow">DEIN GELD. DEIN ÜBERBLICK.</p><h1>Finanzen</h1><p className="subheading">Ein klarer Blick auf das, was reinkommt und rausgeht.</p></div><button className="button primary" onClick={() => setShowTransactionForm(!showTransactionForm)}><Plus size={15}/>Buchung erfassen</button></div>
    <div className="finance-month-row"><label>Monat<input type="month" value={month} onChange={e => { const value = e.target.value; if (value) { setMonth(value); if (!date.startsWith(value)) setDate(value === monthNow() ? todayKey() : `${value}-01`); } }}/></label><span>Alle Beträge bleiben auf diesem Gerät.</span></div>
    {showTransactionForm && <form className="finance-form" onSubmit={saveTransaction}><div className="task-form-title"><b>Neue Buchung</b><button type="button" className="text-button" onClick={() => setShowTransactionForm(false)}>Schließen</button></div><div className="finance-form-grid"><label>Art<select value={kind} onChange={e => { const next = e.target.value as TransactionRecord['kind']; setKind(next); setCategory(next === 'expense' ? expenseCategories[0] : incomeCategories[0]); }}><option value="expense">Ausgabe</option><option value="income">Einnahme</option></select></label><label>Name<input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="z. B. Wocheneinkauf"/></label><label>Betrag<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00"/></label><label>Kategorie<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(value => <option key={value}>{value}</option>)}</select></label><label>Datum<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label><button className="button primary" type="submit">Buchung speichern</button></div>{error && <p className="form-error">{error}</p>}</form>}
    <div className="finance-summary-grid"><article className="finance-summary-card"><span className="finance-card-label"><i className="income-icon"><ArrowDownLeft size={14}/></i>Einnahmen</span><b>{money(summary.incomeCents, currency)}</b><small>im ausgewählten Monat</small></article><article className="finance-summary-card"><span className="finance-card-label"><i className="expense-icon"><ArrowUpRight size={14}/></i>Ausgaben</span><b>{money(summary.expenseCents, currency)}</b><small>im ausgewählten Monat</small></article><article className="finance-summary-card"><span className="finance-card-label"><i className="balance-icon"><Wallet size={14}/></i>Übrig</span><b className={summary.netCents < 0 ? 'negative' : ''}>{money(summary.netCents, currency)}</b><small>Einnahmen abzüglich Ausgaben</small></article></div>
    <div className="finance-panels"><section className="finance-panel"><div className="finance-panel-heading"><div><h2>Monatsbudget</h2><p>Lege dir einen Rahmen für den Monat fest.</p></div></div><form className="budget-form" onSubmit={saveBudget}><label><span>Budget</span><div><input inputMode="decimal" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} placeholder="z. B. 2.000,00"/><button className="button" type="submit">Speichern</button></div></label></form>{budgetCents !== null && <><div className="budget-progress-label"><span>{money(summary.expenseCents, currency)} ausgegeben</span><span>{money(budgetCents, currency)}</span></div><div className="budget-progress"><i style={{ width: `${budgetCents === 0 ? 0 : Math.min(100, summary.expenseCents / budgetCents * 100)}%` }}/></div><small className="budget-remaining">{budgetCents - summary.expenseCents >= 0 ? `${money(budgetCents - summary.expenseCents, currency)} verbleibend` : `${money(summary.expenseCents - budgetCents, currency)} über dem Budget`}</small></>}</section>
      <section className="finance-panel"><div className="finance-panel-heading"><div><h2>Ausgaben nach Kategorie</h2><p>So verteilt sich dein Monat.</p></div></div>{summary.expenseByCategory.size ? <div className="category-bars">{[...summary.expenseByCategory.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => <div className="category-bar-row" key={name}><div><span>{name}</span><b>{money(value, currency)}</b></div><i><span style={{ width: `${Math.max(3, value / maxCategory * 100)}%` }}/></i></div>)}</div> : <div className="finance-panel-empty">Deine Ausgaben erscheinen hier nach der ersten Buchung.</div>}</section></div>
    <section className="finance-panel transaction-panel"><div className="finance-panel-heading"><div><h2>Buchungen</h2><p>{transactions.length} {transactions.length === 1 ? 'Eintrag' : 'Einträge'} in diesem Monat.</p></div></div>{transactions.length ? <div className="transaction-list">{transactions.map(transaction => <article className="transaction-row" key={transaction.id}><span className={`transaction-icon ${transaction.kind}`}>{transaction.kind === 'income' ? <ArrowDownLeft size={15}/> : <ArrowUpRight size={15}/>}</span><div className="transaction-info"><b>{transaction.title}</b><small>{transaction.category} · {new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' }).format(new Date(`${transaction.date}T12:00:00`))}</small></div><strong className={transaction.kind}>{transaction.kind === 'income' ? '+' : '−'}{money(transaction.amountCents, currency)}</strong><button className="icon-button" aria-label={`${transaction.title} löschen`} onClick={() => void removeTransaction(transaction.id)}><Trash2 size={14}/></button></article>)}</div> : <div className="finance-panel-empty">Noch keine Buchungen in diesem Monat. Erfasse deine erste Einnahme oder Ausgabe.</div>}</section>
    <section className="finance-panel savings-panel"><div className="finance-panel-heading"><div><h2>Sparziele</h2><p>Kleine Schritte bringen dich deinem Ziel näher.</p></div></div><form className="goal-form" onSubmit={saveGoal}><input value={goalTitle} onChange={e => setGoalTitle(e.target.value)} maxLength={80} placeholder="Name des Sparziels"/><input inputMode="decimal" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="Zielbetrag"/><button className="button" type="submit"><Plus size={14}/>Ziel anlegen</button></form>{goals.map(goal => { const progress = Math.min(100, goal.savedCents / goal.targetCents * 100); return <article className="goal-row" key={goal.id}><div className="goal-heading"><b>{goal.title}</b><button className="icon-button" aria-label={`${goal.title} löschen`} onClick={() => void removeGoal(goal.id)}><Trash2 size={14}/></button></div><div className="goal-values"><span>{money(goal.savedCents, currency)}</span><span>{money(goal.targetCents, currency)}</span></div><div className="budget-progress"><i style={{ width: `${progress}%` }}/></div><div className="goal-add"><input inputMode="decimal" value={depositInputs[goal.id] ?? ''} onChange={e => setDepositInputs(current => ({ ...current, [goal.id]: e.target.value }))} placeholder="Betrag einzahlen"/><button className="button" onClick={() => void addSavings(goal)}>Einzahlen</button></div></article>; })}{error && !showTransactionForm && <p className="form-error">{error}</p>}</section>
  </section>;
}
