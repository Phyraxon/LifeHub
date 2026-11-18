import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, ChevronDown, Heart, ListPlus, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
import { db, type ShoppingCategory, type ShoppingItem, type ShoppingList } from '../../data/database';
import { calculateShoppingTotals } from './totals';
import { deleteSyncedRecords } from '../sync/localDeletes';

const categories: ShoppingCategory[] = ['Lebensmittel', 'Getränke', 'Drogerie', 'Haushalt', 'Technik', 'Kleidung', 'Sonstiges'];
const units = ['Stück', 'Packung', 'kg', 'g', 'l', 'ml', 'Flasche', 'Dose'];
const money = (amount: number, currency: string) => new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);

export default function ShoppingPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currency, setCurrency] = useState('EUR');
  const [listName, setListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('Stück');
  const [category, setCategory] = useState<ShoppingCategory>('Lebensmittel');
  const [price, setPrice] = useState('');
  const [showChecked, setShowChecked] = useState(true);
  const [error, setError] = useState('');

  const refreshLists = async () => {
    const current = await db.shoppingLists.orderBy('createdAt').reverse().toArray();
    setLists(current);
    if (!selectedId && current.length) setSelectedId(current[0].id);
    else if (selectedId && !current.some(list => list.id === selectedId)) setSelectedId(current[0]?.id ?? null);
  };
  const refreshItems = async (listId = selectedId) => {
    setItems(listId ? await db.shoppingItems.where('listId').equals(listId).sortBy('createdAt') : []);
  };
  useEffect(() => { void refreshLists(); void db.settings.get('app').then(settings => { if (settings?.currency) setCurrency(settings.currency); }); }, []);
  useEffect(() => { void refreshItems(selectedId); }, [selectedId]);

  const currentList = lists.find(list => list.id === selectedId);
  const visibleItems = useMemo(() => items.filter(item => showChecked || !item.checkedAt), [items, showChecked]);
  const totals = calculateShoppingTotals(items);

  const createList = async (event: FormEvent) => {
    event.preventDefault();
    const clean = listName.trim(); if (!clean) return;
    const now = new Date().toISOString(); const id = crypto.randomUUID();
    await db.shoppingLists.add({ id, name: clean, createdAt: now, updatedAt: now });
    setListName(''); setCreatingList(false); await refreshLists(); setSelectedId(id);
  };
  const deleteList = async () => {
    if (!selectedId) return;
    const itemIds = await db.shoppingItems.where('listId').equals(selectedId).primaryKeys();
    await deleteSyncedRecords([{ table: 'shoppingItems', ids: itemIds }, { table: 'shoppingLists', ids: [selectedId] }]);
    setSelectedId(null); await refreshLists();
  };

  const resetItemForm = () => { setEditingId(null); setName(''); setQuantity('1'); setUnit('Stück'); setCategory('Lebensmittel'); setPrice(''); setError(''); };
  const saveItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId) { setError('Erstelle zuerst eine Einkaufsliste.'); return; }
    const clean = name.trim(); const qty = Number(quantity); const parsedPrice = price.trim() ? Number(price.replace(',', '.')) : null;
    if (!clean || !Number.isFinite(qty) || qty <= 0) { setError('Bitte gib einen Namen und eine Menge größer als null ein.'); return; }
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) { setError('Der Preis muss eine gültige positive Zahl sein.'); return; }
    const now = new Date().toISOString();
    if (editingId) {
      const old = await db.shoppingItems.get(editingId);
      if (old) await db.shoppingItems.put({ ...old, name: clean, quantity: qty, unit, category, price: parsedPrice, updatedAt: now });
    } else {
      await db.shoppingItems.add({ id: crypto.randomUUID(), listId: selectedId, name: clean, quantity: qty, unit, category, price: parsedPrice, checkedAt: null, favorite: false, createdAt: now, updatedAt: now });
    }
    resetItemForm(); await refreshItems();
  };
  const editItem = (item: ShoppingItem) => { setEditingId(item.id); setName(item.name); setQuantity(String(item.quantity)); setUnit(item.unit); setCategory(item.category); setPrice(item.price === null ? '' : String(item.price)); setError(''); };
  const toggleItem = async (item: ShoppingItem) => { await db.shoppingItems.update(item.id, { checkedAt: item.checkedAt ? null : new Date().toISOString(), updatedAt: new Date().toISOString() }); await refreshItems(); };
  const toggleFavorite = async (item: ShoppingItem) => { await db.shoppingItems.update(item.id, { favorite: !item.favorite, updatedAt: new Date().toISOString() }); await refreshItems(); };
  const removeItem = async (id: string) => { await deleteSyncedRecords([{ table: 'shoppingItems', ids: [id] }]); await refreshItems(); };

  return <section className="shopping-page">
    <div className="welcome-line"><div><p className="eyebrow">DEIN ALLTAG</p><h1>Einkäufe</h1><p className="subheading">Alles auf deiner Liste. Ganz entspannt.</p></div><button className="button primary" onClick={() => setCreatingList(true)}><ListPlus size={15}/>Neue Liste</button></div>
    <div className="shopping-layout"><aside className="shopping-sidebar"><div className="shopping-side-heading"><b>Meine Listen</b><button className="icon-button" aria-label="Liste hinzufügen" onClick={() => setCreatingList(true)}><Plus size={15}/></button></div>{lists.map(list => <button key={list.id} className={`shopping-list-choice ${selectedId === list.id ? 'selected' : ''}`} onClick={() => { setSelectedId(list.id); resetItemForm(); }}><ShoppingBasket size={15}/><span>{list.name}</span><small>{items.length && selectedId === list.id ? items.length : ''}</small></button>)}{!lists.length && <p className="shopping-side-empty">Deine Listen erscheinen hier.</p>}</aside>
      <div className="shopping-main">{currentList ? <><div className="shopping-list-header"><div><h2>{currentList.name}</h2><p>{items.filter(item => !item.checkedAt).length} offen · {items.filter(item => item.checkedAt).length} erledigt</p></div><button className="icon-button" aria-label="Liste löschen" title="Liste samt Artikeln löschen" onClick={() => void deleteList()}><Trash2 size={16}/></button></div>
        <form className="shopping-add-form" onSubmit={saveItem}><div className="shopping-form-top"><input value={name} onChange={e => setName(e.target.value)} placeholder="Was brauchst du?" aria-label="Produktname"/><button className="button primary" type="submit">{editingId ? 'Speichern' : <><Plus size={15}/>Hinzufügen</>}</button></div><div className="shopping-form-fields"><label>Menge<input type="number" min="0.01" step="any" value={quantity} onChange={e => setQuantity(e.target.value)}/></label><label>Einheit<select value={unit} onChange={e => setUnit(e.target.value)}>{units.map(value => <option key={value}>{value}</option>)}</select></label><label>Kategorie<select value={category} onChange={e => setCategory(e.target.value as ShoppingCategory)}>{categories.map(value => <option key={value}>{value}</option>)}</select></label><label>Preis pro Einheit<input inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="Optional"/></label>{editingId && <button type="button" className="text-button" onClick={resetItemForm}>Abbrechen</button>}</div>{error && <p className="form-error">{error}</p>}</form>
        <div className="shopping-items-toolbar"><span>Artikel</span><button className="text-button" onClick={() => setShowChecked(!showChecked)}>{showChecked ? 'Erledigte ausblenden' : 'Erledigte anzeigen'} <ChevronDown size={13}/></button></div>
        {visibleItems.length ? <div className="shopping-items">{visibleItems.map(item => <article key={item.id} className={`shopping-item ${item.checkedAt ? 'checked' : ''}`}><button className="shopping-check" aria-label={item.checkedAt ? 'Als offen markieren' : 'Als erledigt markieren'} onClick={() => void toggleItem(item)}>{item.checkedAt && <Check size={13}/>}</button><button className="shopping-item-name" onClick={() => editItem(item)}><b>{item.name}</b><small>{item.quantity} {item.unit} · {item.category}</small></button>{item.price !== null && <span className="shopping-item-price">{money(item.price * item.quantity, currency)}</span>}<button className={`icon-button shopping-favorite ${item.favorite ? 'favorite' : ''}`} aria-label={item.favorite ? 'Favorit entfernen' : 'Als Favorit speichern'} onClick={() => void toggleFavorite(item)}><Heart size={15}/></button><button className="icon-button shopping-remove" aria-label={`${item.name} löschen`} onClick={() => void removeItem(item.id)}><Trash2 size={14}/></button></article>)}</div> : <div className="shopping-empty"><div className="task-empty-icon"><ShoppingBasket size={19}/></div><h2>{items.length ? 'Alles abgehakt!' : 'Die Liste ist noch leer'}</h2><p>{items.length ? 'Du kannst erledigte Artikel wieder einblenden.' : 'Füge oben den ersten Artikel hinzu.'}</p></div>}
        <div className="shopping-total"><span>Offene Artikel: {items.filter(item => !item.checkedAt).length}</span><div><small>Gesamtsumme der Liste</small><b>{money(totals.total, currency)}</b><small>Noch offen: {money(totals.open, currency)}</small></div></div>
      </> : <div className="shopping-empty no-list"><div className="task-empty-icon"><ShoppingBasket size={19}/></div><h2>Welche Liste brauchst du?</h2><p>Erstelle eine Einkaufsliste für deinen nächsten Einkauf.</p><button className="button primary" onClick={() => setCreatingList(true)}><Plus size={14}/>Erste Liste erstellen</button></div>}</div></div>
    {creatingList && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setCreatingList(false)}><form className="quick-modal shopping-list-modal" onSubmit={createList}><div className="modal-title-row"><div><p className="eyebrow">EINKÄUFE</p><h2>Neue Einkaufsliste</h2></div></div><label className="calendar-field">Listenname<input autoFocus maxLength={60} value={listName} onChange={e => setListName(e.target.value)} placeholder="z. B. Wocheneinkauf"/></label><div className="calendar-form-actions"><button type="button" className="button" onClick={() => setCreatingList(false)}>Abbrechen</button><button className="button primary" type="submit">Liste erstellen</button></div></form></div>}
  </section>;
}
