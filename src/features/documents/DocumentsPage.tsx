import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Download, Eye, FileText, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { db, type DocumentCategory, type StoredDocument } from '../../data/database';
import { getDocumentFileError } from './fileRules';
import { deleteSyncedRecords } from '../sync/localDeletes';

const categories: DocumentCategory[] = ['Rechnungen', 'Versicherungen', 'Verträge', 'Bescheide', 'Garantien', 'Anleitungen', 'Persönliches', 'Sonstiges'];
const readableSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Alle');
  const [file, setFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<StoredDocument | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [preview, setPreview] = useState<StoredDocument | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Rechnungen');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [storageText, setStorageText] = useState('Speicherplatz wird geprüft …');

  const refresh = async () => setDocuments(await db.documents.orderBy('createdAt').reverse().toArray());
  useEffect(() => { void refresh(); void updateStorage(); }, []);
  const updateStorage = async () => {
    if (!navigator.storage?.estimate) { setStorageText('Speicheranzeige wird von diesem Browser nicht unterstützt.'); return; }
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage !== undefined && estimate.quota !== undefined) setStorageText(`${readableSize(estimate.usage)} von ${readableSize(estimate.quota)} Browser-Speicher belegt`);
      else setStorageText('Browser-Speicher verfügbar');
    } catch { setStorageText('Browser-Speicher verfügbar'); }
  };

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return documents.filter(document => (categoryFilter === 'Alle' || document.category === categoryFilter) && (!term || `${document.name} ${document.description} ${document.tags.join(' ')}`.toLocaleLowerCase().includes(term)));
  }, [documents, query, categoryFilter]);

  const startAdd = () => { setEditing(null); setFile(null); setName(''); setCategory('Rechnungen'); setDescription(''); setTags(''); setIssuedAt(''); setExpiresAt(''); setError(''); setFormOpen(true); };
  const startEdit = (doc: StoredDocument) => { setEditing(doc); setFile(null); setName(doc.name); setCategory(doc.category); setDescription(doc.description); setTags(doc.tags.join(', ')); setIssuedAt(doc.issuedAt ?? ''); setExpiresAt(doc.expiresAt ?? ''); setError(''); setFormOpen(true); };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { setError('Bitte gib dem Dokument einen Namen.'); return; }
    if (!editing && !file) { setError('Wähle zuerst eine Datei aus.'); return; }
    if (file) {
      const validation = getDocumentFileError(file.name, file.type, file.size);
      if (validation) { setError(validation); return; }
      if (navigator.storage?.estimate) {
        try {
          const { quota, usage } = await navigator.storage.estimate();
          if (quota !== undefined && usage !== undefined && quota - usage < file.size + 1024 * 1024) { setError('Der Browser-Speicher reicht für diese Datei nicht aus. Lösche Dateien oder gib Speicher frei.'); return; }
        } catch { /* Browser quota estimates are advisory; the database write still handles quota errors. */ }
      }
    }
    const now = new Date().toISOString(); const cleanTags = [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))];
    try {
      if (editing) {
        await db.documents.put({ ...editing, name: cleanName, category, description: description.trim(), tags: cleanTags, issuedAt: issuedAt || null, expiresAt: expiresAt || null, updatedAt: now });
      } else if (file) {
        const extension = file.name.slice(file.name.lastIndexOf('.')).toLocaleLowerCase();
        const mimeType = file.type || (extension === '.pdf' ? 'application/pdf' : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : `image/${extension.slice(1)}`);
        await db.documents.add({ id: crypto.randomUUID(), name: cleanName, mimeType, size: file.size, category, description: description.trim(), tags: cleanTags, issuedAt: issuedAt || null, expiresAt: expiresAt || null, blob: file, createdAt: now, updatedAt: now });
      }
      setEditing(null); setFile(null); setFormOpen(false); setError(''); await refresh(); await updateStorage();
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === 'QuotaExceededError' ? 'Der Browser-Speicher ist voll. Entferne Dateien oder verwende eine kleinere Datei.' : 'Das Dokument konnte nicht gespeichert werden.');
    }
  };

  const remove = async (doc: StoredDocument) => { await deleteSyncedRecords([{ table: 'documents', ids: [doc.id] }]); if (preview?.id === doc.id) setPreview(null); await refresh(); await updateStorage(); };
  const download = (doc: StoredDocument) => { const url = URL.createObjectURL(doc.blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = doc.name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); };

  return <section className="documents-page">
    <div className="welcome-line"><div><p className="eyebrow">DEINE UNTERLAGEN</p><h1>Dokumente</h1><p className="subheading">Wichtiges sicher auf diesem Gerät aufbewahrt.</p></div><button className="button primary" onClick={startAdd}><Upload size={15}/>Dokument hinzufügen</button></div>
    <div className="documents-toolbar"><label className="documents-search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Dokumente durchsuchen"/></label><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option>Alle</option>{categories.map(value => <option key={value}>{value}</option>)}</select></div>
    <div className="documents-storage"><span><span className="live-dot"/>{storageText}</span><small>PDF, JPG, PNG oder WEBP · maximal 20 MB je Datei</small></div>
    {visible.length ? <div className="document-grid">{visible.map(doc => <article className="document-card" key={doc.id}><button className="document-preview" onClick={() => setPreview(doc)}><span className={`filetype-icon ${doc.mimeType === 'application/pdf' ? 'pdf' : 'image'}`}><FileText size={25}/><small>{doc.mimeType === 'application/pdf' ? 'PDF' : 'BILD'}</small></span><span className="preview-hover"><Eye size={15}/>Ansehen</span></button><div className="document-details"><div className="document-label"><span>{doc.category}</span><small>{readableSize(doc.size)}</small></div><b title={doc.name}>{doc.name}</b>{doc.description && <p>{doc.description}</p>}{doc.tags.length > 0 && <div className="document-tags">{doc.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}<div className="document-dates">{doc.issuedAt && <span>Ausgestellt {new Intl.DateTimeFormat('de-DE').format(new Date(`${doc.issuedAt}T12:00:00`))}</span>}{doc.expiresAt && <span>Läuft ab {new Intl.DateTimeFormat('de-DE').format(new Date(`${doc.expiresAt}T12:00:00`))}</span>}</div><div className="document-actions"><button className="text-button" onClick={() => download(doc)}><Download size={13}/>Herunterladen</button><button className="icon-button" title="Metadaten bearbeiten" aria-label="Metadaten bearbeiten" onClick={() => startEdit(doc)}><Pencil size={14}/></button><button className="icon-button" title="Dokument löschen" aria-label="Dokument löschen" onClick={() => void remove(doc)}><Trash2 size={14}/></button></div></div></article>)}</div> : <div className="task-empty"><div className="task-empty-icon"><FileText size={19}/></div><h2>{query || categoryFilter !== 'Alle' ? 'Keine Dokumente gefunden' : 'Dein Dokumentenbereich ist leer'}</h2><p>{query || categoryFilter !== 'Alle' ? 'Passe Suche oder Kategorie an.' : 'Lade Rechnungen, Garantien und wichtige Unterlagen lokal hoch.'}</p>{!query && categoryFilter === 'Alle' && <button className="button" onClick={startAdd}><Plus size={14}/>Erstes Dokument hinzufügen</button>}</div>}
    {formOpen && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && (setFile(null), setEditing(null), setFormOpen(false))}><form className="document-form" onSubmit={save}><div className="modal-title-row"><div><p className="eyebrow">LOKALER SPEICHER</p><h2>{editing ? 'Dokument bearbeiten' : 'Dokument hinzufügen'}</h2></div><button type="button" className="icon-button" onClick={() => { setFile(null); setEditing(null); setFormOpen(false); }}><X size={18}/></button></div>{!editing && <label className="file-drop"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={e => { const selected = e.target.files?.[0] ?? null; setFile(selected); if (selected) setName(selected.name); setError(''); }}/><Upload size={20}/><b>{file ? file.name : 'Datei auswählen'}</b><small>{file ? readableSize(file.size) : 'PDF, JPG, PNG oder WEBP · bis 20 MB'}</small></label>}<label className="calendar-field">Name<input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={120}/></label><label className="calendar-field">Dokumenttyp<select value={category} onChange={e => setCategory(e.target.value as DocumentCategory)}>{categories.map(value => <option key={value}>{value}</option>)}</select></label><label className="calendar-field">Beschreibung<textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} maxLength={500}/></label><label className="calendar-field">Tags, durch Kommas getrennt<input value={tags} onChange={e => setTags(e.target.value)} placeholder="z. B. Auto, 2026"/></label><div className="calendar-time-fields"><label className="calendar-field">Ausgestellt am<input type="date" value={issuedAt} onChange={e => setIssuedAt(e.target.value)}/></label><label className="calendar-field">Läuft ab am<input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}/></label></div>{error && <p className="form-error">{error}</p>}<div className="calendar-form-actions"><button className="button" type="button" onClick={() => { setFile(null); setEditing(null); setFormOpen(false); }}>Abbrechen</button><button className="button primary" type="submit">{editing ? 'Änderungen speichern' : 'Lokal speichern'}</button></div></form></div>}
    {preview && <DocumentPreview document={preview} onClose={() => setPreview(null)} onDownload={() => download(preview)}/>}
  </section>;
}

function DocumentPreview({ document: doc, onClose, onDownload }: { document: StoredDocument; onClose: () => void; onDownload: () => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const next = URL.createObjectURL(doc.blob); setUrl(next); return () => URL.revokeObjectURL(next); }, [doc]);
  return <div className="modal-backdrop document-preview-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="document-preview-modal"><header><div><b>{doc.name}</b><small>{doc.category} · {readableSize(doc.size)}</small></div><div><button className="icon-button" onClick={onDownload} aria-label="Herunterladen"><Download size={16}/></button><button className="icon-button" onClick={onClose} aria-label="Schließen"><X size={17}/></button></div></header>{url && (doc.mimeType === 'application/pdf' ? <iframe title={doc.name} src={url}/> : <img src={url} alt={doc.name}/>)}</section></div>;
}
