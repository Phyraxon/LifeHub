import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarClock, FileText, Plus, ShieldCheck, Trash2, Wallet, X } from 'lucide-react';
import { db, type Contract, type Device, type StoredDocument } from '../../data/database';
import { calculateNoticeDate, calculateWarrantyEnd, getMonthlyContractCost, getYearlyContractCost } from './calculations';
import { parseMoneyToCents } from '../finances/money';
import { deleteSyncedRecords } from '../sync/localDeletes';

type Tab = 'contracts' | 'devices';
type Editor = 'contract' | 'device' | null;
const money = (amountCents: number, currency: string) => new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amountCents / 100);
const showDate = (value: string) => new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const todayKey = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };

export default function AssetsPage({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [currency, setCurrency] = useState('EUR');
  const [editor, setEditor] = useState<Editor>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [cost, setCost] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [startedAt, setStartedAt] = useState(todayKey());
  const [endsAt, setEndsAt] = useState('');
  const [renewalAt, setRenewalAt] = useState('');
  const [noticeDays, setNoticeDays] = useState('30');
  const [manufacturer, setManufacturer] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [price, setPrice] = useState('');
  const [retailer, setRetailer] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('24');
  const [documentId, setDocumentId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    const [savedContracts, savedDevices, savedDocuments] = await Promise.all([
      db.contracts.orderBy('createdAt').reverse().toArray(),
      db.devices.orderBy('createdAt').reverse().toArray(),
      db.documents.orderBy('createdAt').reverse().toArray(),
    ]);
    setContracts(savedContracts); setDevices(savedDevices); setDocuments(savedDocuments);
  };
  useEffect(() => { void refresh(); void db.settings.get('app').then(settings => { if (settings?.currency) setCurrency(settings.currency); }); }, []);

  const monthlyTotal = contracts.reduce((sum, contract) => sum + getMonthlyContractCost(contract), 0);
  const yearlyTotal = contracts.reduce((sum, contract) => sum + getYearlyContractCost(contract), 0);
  const upcoming = useMemo(() => contracts.flatMap(contract => {
    const renewalDate = contract.renewalAt ?? contract.endsAt;
    const relevant = [renewalDate && { date: renewalDate, label: contract.renewalAt ? 'Verlängerung' : 'Vertragsende' }, renewalDate && { date: calculateNoticeDate(renewalDate, contract.noticeDays), label: 'Kündigungsfrist' }].filter((entry): entry is { date: string; label: string } => !!entry);
    return relevant.filter(entry => entry.date >= todayKey()).map(entry => ({ ...entry, name: contract.name }));
  }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5), [contracts]);
  const warrantyLimit = new Date(); warrantyLimit.setDate(warrantyLimit.getDate() + 90);
  const nearExpiry = devices.filter(device => device.warrantyEndAt && device.warrantyEndAt >= todayKey() && device.warrantyEndAt <= `${warrantyLimit.getFullYear()}-${String(warrantyLimit.getMonth() + 1).padStart(2, '0')}-${String(warrantyLimit.getDate()).padStart(2, '0')}`).sort((a, b) => (a.warrantyEndAt ?? '').localeCompare(b.warrantyEndAt ?? '')).slice(0, 5);

  const clear = () => { setEditor(null); setEditingId(null); setName(''); setProvider(''); setCost(''); setBillingCycle('monthly'); setStartedAt(todayKey()); setEndsAt(''); setRenewalAt(''); setNoticeDays('30'); setManufacturer(''); setPurchaseDate(''); setPrice(''); setRetailer(''); setSerialNumber(''); setWarrantyMonths('24'); setDocumentId(''); setNotes(''); setError(''); };
  const openContract = (contract?: Contract) => {
    clear(); setTab('contracts'); setEditor('contract');
    if (contract) { setEditingId(contract.id); setName(contract.name); setProvider(contract.provider); setCost(String(contract.costCents / 100).replace('.', ',')); setBillingCycle(contract.billingCycle); setStartedAt(contract.startedAt); setEndsAt(contract.endsAt ?? ''); setRenewalAt(contract.renewalAt ?? ''); setNoticeDays(String(contract.noticeDays)); setDocumentId(contract.documentId ?? ''); setNotes(contract.notes); }
  };
  const openDevice = (device?: Device) => {
    clear(); setTab('devices'); setEditor('device');
    if (device) { setEditingId(device.id); setName(device.name); setManufacturer(device.manufacturer); setPurchaseDate(device.purchaseDate ?? ''); setPrice(device.priceCents === null ? '' : String(device.priceCents / 100).replace('.', ',')); setRetailer(device.retailer); setSerialNumber(device.serialNumber); setWarrantyMonths(String(device.warrantyMonths)); setDocumentId(device.documentId ?? ''); setNotes(device.notes); }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault(); const cleanName = name.trim(); const now = new Date().toISOString();
    if (!cleanName) { setError('Bitte gib einen Namen ein.'); return; }
    if (editor === 'contract') {
      const costCents = parseMoneyToCents(cost); const days = Number(noticeDays);
      if (costCents === null || !Number.isInteger(days) || days < 0 || !startedAt) { setError('Bitte prüfe Kosten, Vertragsbeginn und Kündigungsfrist.'); return; }
      const record = { name: cleanName, provider: provider.trim(), costCents, billingCycle, startedAt, endsAt: endsAt || null, renewalAt: renewalAt || null, noticeDays: days, documentId: documentId || null, notes: notes.trim(), updatedAt: now };
      if (editingId) { const existing = await db.contracts.get(editingId); if (existing) await db.contracts.put({ ...existing, ...record }); }
      else await db.contracts.add({ id: crypto.randomUUID(), ...record, createdAt: now });
    } else if (editor === 'device') {
      const warranty = Number(warrantyMonths); const priceCents = price.trim() ? parseMoneyToCents(price) : null;
      if (!Number.isInteger(warranty) || warranty < 0 || (price.trim() && priceCents === null)) { setError('Bitte prüfe Garantiezeit und Kaufpreis.'); return; }
      const record = { name: cleanName, manufacturer: manufacturer.trim(), purchaseDate: purchaseDate || null, priceCents, retailer: retailer.trim(), serialNumber: serialNumber.trim(), warrantyMonths: warranty, warrantyEndAt: purchaseDate ? calculateWarrantyEnd(purchaseDate, warranty) : null, documentId: documentId || null, notes: notes.trim(), updatedAt: now };
      if (editingId) { const existing = await db.devices.get(editingId); if (existing) await db.devices.put({ ...existing, ...record }); }
      else await db.devices.add({ id: crypto.randomUUID(), ...record, createdAt: now });
    }
    clear(); await refresh();
  };

  const deleteContract = async (id: string) => { await deleteSyncedRecords([{ table: 'contracts', ids: [id] }]); await refresh(); };
  const deleteDevice = async (id: string) => { await deleteSyncedRecords([{ table: 'devices', ids: [id] }]); await refresh(); };
  const linkedDoc = (id: string | null) => id ? documents.find(doc => doc.id === id)?.name ?? 'Dokument nicht gefunden' : null;

  return <section className="assets-page">
    <div className="welcome-line"><div><p className="eyebrow">WAS DIR WICHTIG IST</p><h1>{tab === 'contracts' ? 'Verträge & Abos' : 'Geräte & Garantien'}</h1><p className="subheading">Behalte Laufzeiten, Kosten und Kaufdaten im Blick.</p></div><button className="button primary" onClick={() => tab === 'contracts' ? openContract() : openDevice()}><Plus size={15}/>{tab === 'contracts' ? 'Vertrag hinzufügen' : 'Gerät hinzufügen'}</button></div>
    <div className="assets-tabs"><button className={tab === 'contracts' ? 'selected' : ''} onClick={() => { setTab('contracts'); clear(); }}>Verträge & Abos <span>{contracts.length}</span></button><button className={tab === 'devices' ? 'selected' : ''} onClick={() => { setTab('devices'); clear(); }}>Geräte & Garantien <span>{devices.length}</span></button></div>
    {tab === 'contracts' ? <><div className="contract-cost-cards"><article><span><Wallet size={14}/>Monatliche Gesamtkosten</span><b>{money(monthlyTotal, currency)}</b></article><article><span><CalendarClock size={14}/>Jährliche Gesamtkosten</span><b>{money(yearlyTotal, currency)}</b></article></div><div className="assets-two-column"><section className="asset-panel"><div className="finance-panel-heading"><div><h2>Laufende Verträge</h2><p>Vertragskosten und wichtige Fristen.</p></div></div>{contracts.length ? <div className="asset-list">{contracts.map(contract => <article className="asset-row" key={contract.id}><div className="asset-icon contract"><FileText size={16}/></div><button className="asset-main" onClick={() => openContract(contract)}><b>{contract.name}</b><small>{contract.provider || 'Kein Anbieter'} · {contract.billingCycle === 'monthly' ? 'monatlich' : 'jährlich'}</small>{contract.documentId && <small className="asset-doc-link"><FileText size={11}/>{linkedDoc(contract.documentId)}</small>}</button><strong>{money(contract.costCents, currency)}<small> / {contract.billingCycle === 'monthly' ? 'Monat' : 'Jahr'}</small></strong><button className="icon-button" aria-label={`${contract.name} löschen`} onClick={() => void deleteContract(contract.id)}><Trash2 size={14}/></button></article>)}</div> : <div className="finance-panel-empty">Noch keine Verträge hinterlegt.</div>}</section><section className="asset-panel"><div className="finance-panel-heading"><div><h2>Kommende Fristen</h2><p>Erinnerungspunkte aus deinen Vertragsdaten.</p></div></div>{upcoming.length ? upcoming.map((item, index) => <div className="date-reminder" key={`${item.name}-${item.label}-${index}`}><CalendarClock size={15}/><span><b>{item.name}</b><small>{item.label} · {showDate(item.date)}</small></span></div>) : <div className="finance-panel-empty">Für Verträge mit Verlängerungsdatum erscheinen Fristen hier.</div>}</section></div></> : <section className="asset-panel devices-panel"><div className="finance-panel-heading"><div><h2>Deine Geräte</h2><p>Kaufdaten, Garantien und verknüpfte Belege.</p></div></div>{devices.length ? <div className="device-grid">{devices.map(device => { const expired = device.warrantyEndAt && device.warrantyEndAt < todayKey(); return <article className="device-card" key={device.id}><div className="device-card-heading"><span className="asset-icon device"><ShieldCheck size={17}/></span><button className="icon-button" title="Gerät löschen" aria-label={`${device.name} löschen`} onClick={() => void deleteDevice(device.id)}><Trash2 size={14}/></button></div><button className="device-title" onClick={() => openDevice(device)}><b>{device.name}</b><small>{device.manufacturer || 'Hersteller nicht angegeben'}</small></button><div className="device-specs">{device.purchaseDate && <span>Gekauft: {showDate(device.purchaseDate)}</span>}{device.retailer && <span>Händler: {device.retailer}</span>}{device.serialNumber && <span>Seriennummer: {device.serialNumber}</span>}{device.priceCents !== null && <span>Kaufpreis: {money(device.priceCents, currency)}</span>}</div>{device.warrantyEndAt && <div className={`warranty-status ${expired ? 'expired' : ''}`}><ShieldCheck size={13}/>{expired ? `Garantie abgelaufen am ${showDate(device.warrantyEndAt)}` : `Garantie bis ${showDate(device.warrantyEndAt)}`}</div>}{device.documentId && <div className="asset-doc-link"><FileText size={11}/>{linkedDoc(device.documentId)}</div>}</article>; })}</div> : <div className="finance-panel-empty">Noch keine Geräte eingetragen.</div>}{nearExpiry.length > 0 && <div className="expiry-callout"><b>Garantie läuft bald ab</b><span>{nearExpiry.map(device => device.name).join(' · ')}</span></div>}</section>}
    {editor && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && clear()}><form className="asset-editor" onSubmit={save}><div className="modal-title-row"><div><p className="eyebrow">{editor === 'contract' ? 'VERTRAGSDATEN' : 'GERÄTEDATEN'}</p><h2>{editingId ? 'Eintrag bearbeiten' : editor === 'contract' ? 'Vertrag hinzufügen' : 'Gerät hinzufügen'}</h2></div><button type="button" className="icon-button" onClick={clear}><X size={18}/></button></div>
      {editor === 'contract' ? <><label className="calendar-field">Vertragsname<input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="z. B. Internet zuhause"/></label><div className="calendar-time-fields"><label className="calendar-field">Anbieter<input value={provider} onChange={e => setProvider(e.target.value)} maxLength={100}/></label><label className="calendar-field">Kosten<input inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)} placeholder="0,00"/></label></div><div className="calendar-time-fields"><label className="calendar-field">Abrechnung<select value={billingCycle} onChange={e => setBillingCycle(e.target.value as 'monthly' | 'yearly')}><option value="monthly">Monatlich</option><option value="yearly">Jährlich</option></select></label><label className="calendar-field">Beginn<input type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)}/></label></div><div className="calendar-time-fields"><label className="calendar-field">Vertragsende<input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)}/></label><label className="calendar-field">Verlängerungsdatum<input type="date" value={renewalAt} onChange={e => setRenewalAt(e.target.value)}/></label></div><label className="calendar-field">Kündigungsfrist in Tagen<input type="number" min="0" max="3650" value={noticeDays} onChange={e => setNoticeDays(e.target.value)}/></label></> : <><label className="calendar-field">Produktname<input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={100}/></label><div className="calendar-time-fields"><label className="calendar-field">Hersteller<input value={manufacturer} onChange={e => setManufacturer(e.target.value)} maxLength={100}/></label><label className="calendar-field">Händler<input value={retailer} onChange={e => setRetailer(e.target.value)} maxLength={100}/></label></div><div className="calendar-time-fields"><label className="calendar-field">Kaufdatum<input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}/></label><label className="calendar-field">Kaufpreis<input inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="Optional"/></label></div><div className="calendar-time-fields"><label className="calendar-field">Seriennummer<input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} maxLength={100}/></label><label className="calendar-field">Garantie (Monate)<input type="number" min="0" max="600" value={warrantyMonths} onChange={e => setWarrantyMonths(e.target.value)}/></label></div>{purchaseDate && Number(warrantyMonths) > 0 && <p className="warranty-preview">Garantie endet voraussichtlich am {showDate(calculateWarrantyEnd(purchaseDate, Number(warrantyMonths)) ?? purchaseDate)}.</p>}</>}
      <label className="calendar-field">Beleg verknüpfen<select value={documentId} onChange={e => setDocumentId(e.target.value)}><option value="">Kein Dokument</option>{documents.map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}</select></label><label className="calendar-field">Notizen<textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} maxLength={800}/></label>{error && <p className="form-error">{error}</p>}<div className="calendar-form-actions"><button type="button" className="button" onClick={clear}>Abbrechen</button><button type="submit" className="button primary">Speichern</button></div>
    </form></div>}
  </section>;
}
