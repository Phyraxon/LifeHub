import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckSquare, ChevronLeft, ChevronRight, CircleHelp, Command, FileText, Home, Moon, MoreHorizontal, Plus, Search, Settings, ShoppingBasket, Sparkles, Sun, Wallet, X } from 'lucide-react';
import { db, defaultSettings } from './data/database';
import TasksPage from './features/tasks/TasksPage';
import CalendarPage from './features/calendar/CalendarPage';
import ShoppingPage from './features/shopping/ShoppingPage';

const navigation = [
  { label: 'Dashboard', icon: Home, path: '/' }, { label: 'Kalender', icon: CalendarDays, path: '/kalender' },
  { label: 'Aufgaben', icon: CheckSquare, path: '/aufgaben' }, { label: 'Haushalt', icon: Sparkles, path: '/haushalt' },
  { label: 'Finanzen', icon: Wallet, path: '/finanzen' }, { label: 'Einkäufe', icon: ShoppingBasket, path: '/einkaeufe' },
  { label: 'Dokumente', icon: FileText, path: '/dokumente' },
];

function App() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('lifehub-theme') === 'light' ? 'light' : 'dark');
  const [collapsed, setCollapsed] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(localStorage.getItem('lifehub-welcome') === 'done');
  useEffect(() => { void db.settings.get('app').then(saved => { if (saved?.theme !== 'system') setTheme(saved?.theme ?? 'dark'); }); }, []);
  const saveTheme = (next: 'dark' | 'light') => { setTheme(next); localStorage.setItem('lifehub-theme', next); void db.settings.get('app').then(saved => db.settings.put({ ...(saved ?? defaultSettings), theme: next, updatedAt: new Date().toISOString() })); };
  const greeting = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  if (!welcomeDone) return <main className="welcome-screen" data-theme={theme}><section className="welcome-card"><div className="brand-mark large"><Sparkles size={24}/></div><p className="eyebrow">DEIN ALLTAG. AN EINEM ORT.</p><h1>Willkommen bei<br/><span>LIFEHUB.</span></h1><p className="welcome-copy">Ein ruhiger Ort für alles, was deinen Alltag ausmacht. Deine Daten bleiben auf diesem Gerät.</p><button className="button primary wide" onClick={() => { localStorage.setItem('lifehub-welcome', 'done'); setWelcomeDone(true); }}>LIFEHUB entdecken <ChevronRight size={17}/></button><div className="privacy-note"><span className="privacy-dot"/> Privat. Lokal. Nur für dich.</div></section><div className="welcome-glow"/></main>;

  return <div className="app-shell" data-theme={theme}>
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand-row"><div className="brand-mark"><Sparkles size={17}/></div>{!collapsed && <div className="brand-name">lifehub<span>.</span></div>}<button className="icon-button collapse-toggle" aria-label="Menü einklappen" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={17}/> : <ChevronLeft size={17}/>}</button></div>
      {!collapsed && <div className="space-switcher"><div className="avatar">P</div><div className="space-copy"><strong>Mein Bereich</strong><span>Persönlicher Workspace</span></div><MoreHorizontal size={17}/></div>}
      <div className="nav-label">MENÜ</div><nav className="nav-list">{navigation.map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? item.label : undefined}><item.icon size={18}/>{!collapsed && <span>{item.label}</span>}{item.label === 'Aufgaben' && !collapsed && <span className="nav-count">0</span>}</NavLink>)}</nav>
      {!collapsed && <><div className="nav-label more-label">WEITERES</div><nav className="nav-list"><NavLink to="/vertraege" className="nav-item"><FileText size={18}/><span>Verträge & Abos</span></NavLink><NavLink to="/geraete" className="nav-item"><Sparkles size={18}/><span>Geräte & Garantien</span></NavLink><NavLink to="/notizen" className="nav-item"><FileText size={18}/><span>Notizen</span></NavLink></nav></>}
      <div className="sidebar-spacer"/><div className="sidebar-bottom"><NavLink to="/einstellungen" className="nav-item" title={collapsed ? 'Einstellungen' : undefined}><Settings size={18}/>{!collapsed && <span>Einstellungen</span>}</NavLink>{!collapsed && <div className="upgrade-card"><div className="upgrade-orb"><Sparkles size={15}/></div><strong>Alles im Blick.</strong><p>Dein Alltag, ganz in deinem Rhythmus.</p></div>}<div className="profile-row"><div className="avatar profile-avatar">P</div>{!collapsed && <><div className="space-copy"><strong>Philipp</strong><span>Persönlich</span></div><MoreHorizontal size={17}/></>}</div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="mobile-brand"><div className="brand-mark"><Sparkles size={16}/></div><b>lifehub<span>.</span></b></div><div className="breadcrumbs"><span>Mein Bereich</span><span className="crumb-divider">/</span><strong>Übersicht</strong></div><div className="top-actions"><button className="search-trigger" onClick={() => setQueryOpen(true)}><Search size={16}/><span>Suchen</span><kbd>⌘ K</kbd></button><span className="top-separator"/><button className="icon-button theme-toggle" aria-label="Darstellung wechseln" onClick={() => saveTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button><button className="icon-button help-button" aria-label="Hilfe"><CircleHelp size={17}/></button><button className="button primary quick-add" onClick={() => setQuickOpen(true)}><Plus size={17}/><span>Neu erstellen</span></button></div></header>
      <div className="page-content"><Routes><Route path="/einstellungen" element={<SettingsPage theme={theme} onThemeChange={saveTheme}/>}/><Route path="/aufgaben" element={<TasksPage/>}/><Route path="/kalender" element={<CalendarPage/>}/><Route path="/einkaeufe" element={<ShoppingPage/>}/><Route path="/einkaeufe" element={<ShoppingPage/>}/><Route path="*" element={<><div className="welcome-line"><div><p className="eyebrow">{greeting.toLocaleUpperCase('de-DE')}</p><h1>Schön, dass du da bist<span className="wave">✳</span></h1><p className="subheading">Hier ist dein Überblick für heute.</p></div><button className="date-chip"><CalendarDays size={15}/>{new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'short'}).format(new Date())}</button></div><section className="empty-hero"><div className="hero-decoration decor-one"/><div className="hero-decoration decor-two"/><div className="hero-content"><div className="hero-icon"><Sparkles size={19}/></div><p className="eyebrow">DEIN PLATZ. DEIN RHYTHMUS.</p><h2>Alles beginnt mit<br/>einem kleinen Schritt.</h2><p>Füge deine erste Aufgabe, einen Termin oder eine Notiz hinzu.<br className="desktop-break"/> LIFEHUB hilft dir, den Überblick zu behalten.</p><button className="button primary" onClick={() => setQuickOpen(true)}><Plus size={16}/>Ersten Eintrag erstellen</button></div><div className="hero-bottom"><span><span className="live-dot"/>Deine Daten werden sicher auf diesem Gerät gespeichert</span><button className="text-button">Mehr erfahren <ChevronRight size={14}/></button></div></section><div className="section-heading"><div><h3>Dein Überblick</h3><p>Das Wichtigste an einem Ort.</p></div><button className="icon-button"><MoreHorizontal size={18}/></button></div><section className="widget-grid"><div className="widget-card"><div className="widget-head"><span className="widget-icon purple"><CheckSquare size={16}/></span><span className="widget-menu"><MoreHorizontal size={17}/></span></div><div className="widget-title">Aufgaben</div><div className="widget-empty">Noch nichts geplant <span>—</span></div><div className="widget-footer">Dein Tag, in deinem Tempo</div></div><div className="widget-card"><div className="widget-head"><span className="widget-icon blue"><CalendarDays size={16}/></span><span className="widget-menu"><MoreHorizontal size={17}/></span></div><div className="widget-title">Als Nächstes</div><div className="widget-empty">Dein Kalender ist frei <span>—</span></div><div className="widget-footer">Zeit für das, was dir wichtig ist</div></div><div className="widget-card budget-card"><div className="widget-head"><span className="widget-icon green"><Wallet size={16}/></span><span className="widget-menu"><MoreHorizontal size={17}/></span></div><div className="widget-title">Monatsbudget</div><div className="widget-empty">Noch kein Budget festgelegt <span>—</span></div><div className="widget-footer">Behalte deine Finanzen im Blick</div></div></section><footer className="page-footer"><span>Mit Ruhe organisiert.</span><span>Deine Daten bleiben auf deinem Gerät.</span></footer></>}/></Routes></div>
    </main>
    <nav className="mobile-nav">{navigation.slice(0,5).map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({isActive}) => `mobile-nav-item ${isActive?'active':''}`}><item.icon size={19}/><span>{item.label}</span></NavLink>)}</nav>
    {queryOpen && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setQueryOpen(false)}><section className="command-modal"><div className="command-input"><Search size={19}/><input autoFocus placeholder="In deinem LIFEHUB suchen …"/><kbd>ESC</kbd><button className="icon-button" onClick={() => setQueryOpen(false)}><X size={18}/></button></div><div className="command-empty"><Command size={20}/><span>Finde Aufgaben, Termine, Notizen und mehr.</span></div><div className="command-hint"><span>ESC zum Schließen</span><span>Suche auf diesem Gerät</span></div></section></div>}
    {quickOpen && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setQuickOpen(false)}><section className="quick-modal"><div className="modal-title-row"><div><p className="eyebrow">SCHNELL ERLEDIGT</p><h2>Was möchtest du festhalten?</h2></div><button className="icon-button" onClick={() => setQuickOpen(false)}><X size={18}/></button></div><div className="quick-options">{[{icon:CheckSquare,name:'Aufgabe',hint:'Etwas, das du erledigen möchtest'},{icon:CalendarDays,name:'Termin',hint:'Ein Moment, den du planen möchtest'},{icon:FileText,name:'Notiz',hint:'Ein Gedanke, den du behalten möchtest'},{icon:ShoppingBasket,name:'Einkauf',hint:'Etwas, das auf deine Liste gehört'}].map(opt => <button className="quick-option" key={opt.name} disabled={!['Aufgabe', 'Einkauf'].includes(opt.name)} onClick={() => { setQuickOpen(false); navigate(opt.name === 'Aufgabe' ? '/aufgaben' : '/einkaeufe'); }}><span className="quick-option-icon"><opt.icon size={18}/></span><span><b>{opt.name}</b><small>{opt.name === 'Aufgabe' || opt.name === 'Einkauf' ? opt.hint : 'Kommt in einer späteren Etappe'}</small></span><ChevronRight size={16}/></button>)}</div></section></div>}
  </div>;
}
export default App;

function SettingsPage({ theme, onThemeChange }: { theme: 'dark' | 'light'; onThemeChange: (theme: 'dark' | 'light') => void }) {
  const [language, setLanguage] = useState<'de' | 'en'>('de');
  const [currency, setCurrency] = useState('EUR');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void db.settings.get('app').then(async current => {
      if (current) { setLanguage(current.language); setCurrency(current.currency); }
      else await db.settings.put(defaultSettings);
    });
  }, []);

  const persist = async (nextLanguage = language, nextCurrency = currency) => {
    const current = await db.settings.get('app');
    await db.settings.put({ ...(current ?? defaultSettings), language: nextLanguage, currency: nextCurrency, theme, updatedAt: new Date().toISOString() });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return <section className="settings-page">
    <div className="welcome-line"><div><p className="eyebrow">DEIN LIFEHUB</p><h1>Einstellungen</h1><p className="subheading">Passe deinen persönlichen Bereich an.</p></div></div>
    <div className="settings-card"><div className="settings-card-heading"><h2>Darstellung</h2><p>Wähle das Erscheinungsbild für deinen Alltag.</p></div><div className="settings-choice-row"><button className={`settings-choice ${theme === 'light' ? 'selected' : ''}`} onClick={() => onThemeChange('light')}><Sun size={18}/><span><b>Hell</b><small>Helles, klares Erscheinungsbild</small></span><i/></button><button className={`settings-choice ${theme === 'dark' ? 'selected' : ''}`} onClick={() => onThemeChange('dark')}><Moon size={18}/><span><b>Dunkel</b><small>Sanft für die Augen am Abend</small></span><i/></button></div></div>
    <div className="settings-card"><div className="settings-card-heading"><h2>Sprache & Region</h2><p>Sprache und Währung werden lokal gespeichert. Die Oberfläche ist derzeit noch auf Deutsch.</p></div><label className="settings-field"><span>Bevorzugte Sprache</span><select value={language} onChange={e => { const value = e.target.value as 'de' | 'en'; setLanguage(value); void persist(value); }}><option value="de">Deutsch</option><option value="en">English (bevorzugt)</option></select></label><label className="settings-field"><span>Währung</span><select value={currency} onChange={e => { setCurrency(e.target.value); void persist(language, e.target.value); }}><option value="EUR">Euro (EUR)</option><option value="USD">US-Dollar (USD)</option><option value="GBP">Pfund Sterling (GBP)</option><option value="CHF">Schweizer Franken (CHF)</option></select></label></div>
    <div className="settings-storage"><span className="live-dot"/>Einstellungen werden lokal in deinem Browser gespeichert.{saved && <b> Gespeichert.</b>}</div>
  </section>;
}
