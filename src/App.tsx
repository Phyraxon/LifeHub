import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckSquare, Cloud, ChevronLeft, ChevronRight, CircleHelp, FileText, Home, Moon, MoreHorizontal, Plus, Search, Settings, ShoppingBasket, Sparkles, Sun, Wallet, X, Shield } from 'lucide-react';
import { db, defaultSettings } from './data/database';
import TasksPage from './features/tasks/TasksPage';
import CalendarPage from './features/calendar/CalendarPage';
import ShoppingPage from './features/shopping/ShoppingPage';
import HouseholdPage from './features/household/HouseholdPage';
import FinancePage from './features/finances/FinancePage';
import DocumentsPage from './features/documents/DocumentsPage';
import AssetsPage from './features/assets/AssetsPage';
import NotesPage from './features/notes/NotesPage';
import SearchDialog from './features/search/SearchDialog';
import BackupPage from './features/backup/BackupPage';
import ReminderCenter from './features/reminders/ReminderCenter';
import DashboardPage from './features/dashboard/DashboardPage';
import SyncPage from './features/sync/SyncPage';
import PrivacyPage from './features/settings/PrivacyPage';

const navigation = [
  { label: 'Dashboard', icon: Home, path: '/' }, { label: 'Kalender', icon: CalendarDays, path: '/kalender' },
  { label: 'Aufgaben', icon: CheckSquare, path: '/aufgaben' }, { label: 'Haushalt', icon: Sparkles, path: '/haushalt' },
  { label: 'Finanzen', icon: Wallet, path: '/finanzen' }, { label: 'Einkäufe', icon: ShoppingBasket, path: '/einkaeufe' },
  { label: 'Dokumente', icon: FileText, path: '/dokumente' },
];

function App() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<'system' | 'dark' | 'light'>(() => {
    const stored = localStorage.getItem('lifehub-theme');
    return stored === 'dark' || stored === 'light' ? stored : 'system';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => themeMode === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : themeMode);
  const [collapsed, setCollapsed] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(localStorage.getItem('lifehub-welcome') === 'done');
  useEffect(() => { void db.settings.get('app').then(saved => { if (saved?.theme) { setThemeMode(saved.theme); setTheme(saved.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : saved.theme); } }); }, []);
  useEffect(() => { const media = window.matchMedia('(prefers-color-scheme: dark)'); const update = () => { if (themeMode === 'system') setTheme(media.matches ? 'dark' : 'light'); }; media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, [themeMode]);
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') { event.preventDefault(); setQueryOpen(true); } }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, []);
  const saveTheme = (next: 'system' | 'dark' | 'light') => { setThemeMode(next); const resolved = next === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : next; setTheme(resolved); localStorage.setItem('lifehub-theme', next); void db.settings.get('app').then(saved => db.settings.put({ ...(saved ?? defaultSettings), theme: next, updatedAt: new Date().toISOString() })); };

  if (!welcomeDone) return <main className="welcome-screen" data-theme={theme}><section className="welcome-card"><div className="brand-mark large"><Sparkles size={24}/></div><p className="eyebrow">DEIN ALLTAG. AN EINEM ORT.</p><h1>Willkommen bei<br/><span>LIFEHUB.</span></h1><p className="welcome-copy">Ein ruhiger Ort für alles, was deinen Alltag ausmacht. Deine Daten bleiben auf diesem Gerät.</p><button className="button primary wide" onClick={() => { localStorage.setItem('lifehub-welcome', 'done'); setWelcomeDone(true); }}>LIFEHUB entdecken <ChevronRight size={17}/></button><div className="privacy-note"><span className="privacy-dot"/> Privat. Lokal. Nur für dich.</div></section><div className="welcome-glow"/></main>;

  return <div className="app-shell" data-theme={theme}>
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand-row"><div className="brand-mark"><Sparkles size={17}/></div>{!collapsed && <div className="brand-name">lifehub<span>.</span></div>}<button className="icon-button collapse-toggle" aria-label="Menü einklappen" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={17}/> : <ChevronLeft size={17}/>}</button></div>
      {!collapsed && <div className="space-switcher"><div className="avatar">P</div><div className="space-copy"><strong>Mein Bereich</strong><span>Persönlicher Workspace</span></div><MoreHorizontal size={17}/></div>}
      <div className="nav-label">MENÜ</div><nav className="nav-list">{navigation.map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? item.label : undefined}><item.icon size={18}/>{!collapsed && <span>{item.label}</span>}{item.label === 'Aufgaben' && !collapsed && <span className="nav-count">0</span>}</NavLink>)}</nav>
      {!collapsed && <><div className="nav-label more-label">WEITERES</div><nav className="nav-list"><NavLink to="/vertraege" className="nav-item"><FileText size={18}/><span>Verträge & Abos</span></NavLink><NavLink to="/geraete" className="nav-item"><Sparkles size={18}/><span>Geräte & Garantien</span></NavLink><NavLink to="/notizen" className="nav-item"><FileText size={18}/><span>Notizen</span></NavLink></nav></>}
      <div className="sidebar-spacer"/><div className="sidebar-bottom"><NavLink to="/einstellungen" className="nav-item" title={collapsed ? 'Einstellungen' : undefined}><Settings size={18}/>{!collapsed && <span>Einstellungen</span>}</NavLink><NavLink to="/backup" className="nav-item" title={collapsed ? 'Datenschutz & Backup' : undefined}><Shield size={18}/>{!collapsed && <span>Datenschutz & Backup</span>}</NavLink><NavLink to="/synchronisierung" className="nav-item" title={collapsed ? 'Synchronisierung' : undefined}><Cloud size={18}/>{!collapsed && <span>Synchronisierung</span>}</NavLink>{!collapsed && <div className="upgrade-card"><div className="upgrade-orb"><Sparkles size={15}/></div><strong>Alles im Blick.</strong><p>Dein Alltag, ganz in deinem Rhythmus.</p></div>}<div className="profile-row"><div className="avatar profile-avatar">P</div>{!collapsed && <><div className="space-copy"><strong>Philipp</strong><span>Persönlich</span></div><MoreHorizontal size={17}/></>}</div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="mobile-brand"><div className="brand-mark"><Sparkles size={16}/></div><b>lifehub<span>.</span></b></div><div className="breadcrumbs"><span>Mein Bereich</span><span className="crumb-divider">/</span><strong>Übersicht</strong></div><div className="top-actions"><button className="search-trigger" onClick={() => setQueryOpen(true)}><Search size={16}/><span>Suchen</span><kbd>⌘ K</kbd></button><span className="top-separator"/><ReminderCenter/><button className="icon-button theme-toggle" aria-label="Darstellung wechseln" onClick={() => saveTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button><button className="icon-button help-button" aria-label="Hilfe"><CircleHelp size={17}/></button><button className="button primary quick-add" onClick={() => setQuickOpen(true)}><Plus size={17}/><span>Neu erstellen</span></button></div></header>
      <div className="page-content"><Routes><Route path="/einstellungen" element={<SettingsPage theme={themeMode} onThemeChange={saveTheme}/>}/><Route path="/aufgaben" element={<TasksPage/>}/><Route path="/kalender" element={<CalendarPage/>}/><Route path="/einkaeufe" element={<ShoppingPage/>}/><Route path="/haushalt" element={<HouseholdPage/>}/><Route path="/finanzen" element={<FinancePage/>}/><Route path="/dokumente" element={<DocumentsPage/>}/><Route path="/vertraege" element={<AssetsPage initialTab="contracts"/>}/><Route path="/geraete" element={<AssetsPage initialTab="devices"/>}/><Route path="/notizen" element={<NotesPage/>}/><Route path="/backup" element={<BackupPage/>}/><Route path="/synchronisierung" element={<SyncPage/>}/><Route path="/datenschutz" element={<PrivacyPage/>}/><Route path="/" element={<DashboardPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></div>
    </main>
    <nav className="mobile-nav">{navigation.slice(0,5).map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({isActive}) => `mobile-nav-item ${isActive?'active':''}`}><item.icon size={19}/><span>{item.label}</span></NavLink>)}</nav>
    {queryOpen && <SearchDialog onClose={() => setQueryOpen(false)}/>}
    {quickOpen && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setQuickOpen(false)}><section className="quick-modal"><div className="modal-title-row"><div><p className="eyebrow">SCHNELL ERLEDIGT</p><h2>Was möchtest du festhalten?</h2></div><button className="icon-button" onClick={() => setQuickOpen(false)}><X size={18}/></button></div><div className="quick-options">{[{icon:CheckSquare,name:'Aufgabe',hint:'Etwas, das du erledigen möchtest'},{icon:CalendarDays,name:'Termin',hint:'Ein Moment, den du planen möchtest'},{icon:FileText,name:'Notiz',hint:'Ein Gedanke, den du behalten möchtest'},{icon:ShoppingBasket,name:'Einkauf',hint:'Etwas, das auf deine Liste gehört'}].map(opt => <button className="quick-option" key={opt.name} onClick={() => { setQuickOpen(false); navigate(opt.name === 'Aufgabe' ? '/aufgaben?new=1' : opt.name === 'Termin' ? '/kalender?new=1' : opt.name === 'Einkauf' ? '/einkaeufe' : '/notizen?new=1'); }}><span className="quick-option-icon"><opt.icon size={18}/></span><span><b>{opt.name}</b><small>{opt.hint}</small></span><ChevronRight size={16}/></button>)}</div></section></div>}
  </div>;
}
export default App;

function SettingsPage({ theme, onThemeChange }: { theme: 'system' | 'dark' | 'light'; onThemeChange: (theme: 'system' | 'dark' | 'light') => void }) {
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
    <div className="settings-card"><div className="settings-card-heading"><h2>Darstellung</h2><p>Wähle das Erscheinungsbild für deinen Alltag.</p></div><div className="settings-choice-row"><button className={`settings-choice ${theme === 'system' ? 'selected' : ''}`} onClick={() => onThemeChange('system')}><Sparkles size={18}/><span><b>System</b><small>Passt sich deinem Gerät an</small></span><i/></button><button className={`settings-choice ${theme === 'light' ? 'selected' : ''}`} onClick={() => onThemeChange('light')}><Sun size={18}/><span><b>Hell</b><small>Helles, klares Erscheinungsbild</small></span><i/></button><button className={`settings-choice ${theme === 'dark' ? 'selected' : ''}`} onClick={() => onThemeChange('dark')}><Moon size={18}/><span><b>Dunkel</b><small>Sanft für die Augen am Abend</small></span><i/></button></div></div>
    <div className="settings-card"><div className="settings-card-heading"><h2>Sprache & Region</h2><p>Sprache und Währung werden lokal gespeichert. Die Oberfläche ist derzeit noch auf Deutsch.</p></div><label className="settings-field"><span>Bevorzugte Sprache</span><select value={language} onChange={e => { const value = e.target.value as 'de' | 'en'; setLanguage(value); void persist(value); }}><option value="de">Deutsch</option><option value="en">English (bevorzugt)</option></select></label><label className="settings-field"><span>Währung</span><select value={currency} onChange={e => { setCurrency(e.target.value); void persist(language, e.target.value); }}><option value="EUR">Euro (EUR)</option><option value="USD">US-Dollar (USD)</option><option value="GBP">Pfund Sterling (GBP)</option><option value="CHF">Schweizer Franken (CHF)</option></select></label></div>
    <Link className="settings-sync-link" to="/synchronisierung"><Cloud size={16}/><span><b>Geräte synchronisieren</b><small>Google Drive oder deine eigene WebDAV-Cloud</small></span><ChevronRight size={15}/></Link>    <Link className="settings-privacy-link" to="/datenschutz">Datenschutzhinweise</Link>    <div className="settings-storage"><span className="live-dot"/>Einstellungen werden lokal in deinem Browser gespeichert.{saved && <b> Gespeichert.</b>}</div>
  </section>;
}
