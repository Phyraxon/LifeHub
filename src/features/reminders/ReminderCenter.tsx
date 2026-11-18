import { useEffect, useState } from 'react';
import { Bell, CalendarClock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getReminders, type ReminderItem } from './reminderService';

export default function ReminderCenter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ReminderItem[]>([]);
  const refresh = async () => setItems(await getReminders());
  useEffect(() => { void refresh(); }, []);

  return <div className="reminder-center"><button className="icon-button reminder-trigger" aria-label={`Erinnerungen${items.length ? `, ${items.length} offen` : ''}`} onClick={() => { setOpen(!open); void refresh(); }}><Bell size={17}/>{items.length > 0 && <i>{items.length > 9 ? '9+' : items.length}</i>}</button>{open && <section className="reminder-popover"><header><div><b>Erinnerungen</b><small>{items.length ? `${items.length} anstehend` : 'Alles im Blick'}</small></div></header>{items.length ? <div className="reminder-list">{items.map(item => <button key={item.id} className={`reminder-item ${item.severity}`} onClick={() => { setOpen(false); navigate(item.route); }}><span className="reminder-item-icon"><CalendarClock size={15}/></span><span><b>{item.title}</b><small>{item.detail}</small></span><ChevronRight size={14}/></button>)}</div> : <div className="reminder-empty">Aktuell ist nichts Dringendes vorgemerkt.</div>}<footer>Diese Übersicht wird beim Öffnen aktualisiert. Browser-Push ist nicht aktiviert; Browser-Benachrichtigungen können je nach Gerät eingeschränkt sein und sind kein garantierter Push-Dienst.</footer></section>}</div>;
}
