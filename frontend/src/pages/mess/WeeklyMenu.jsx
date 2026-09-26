import { useEffect, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { MEALS, WEEK_DAYS } from '../../config/hostel';
import { dayName } from './menuUtils';

// Week table on desktop, day cards on phones. `onSave` makes it editable.
const WeeklyMenu = ({ menu, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(menu);
  const [saving, setSaving] = useState(false);
  const today = dayName();

  useEffect(() => {
    if (!editing) setDraft(menu);
  }, [menu, editing]);

  const setCell = (day, meal, value) => setDraft((d) => ({ ...d, [day]: { ...d[day], [meal]: value } }));

  const save = async () => {
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) setEditing(false);
  };

  const shown = editing ? draft : menu;

  return (
    <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-[16px] font-bold m-0">Weekly menu</h2>
          <p className="text-[12px] text-[var(--text-tertiary)] m-0">{editing ? 'Type the dishes, then save for everyone' : 'Same menu every week until changed'}</p>
        </div>
        {onSave && (editing ? (
          <div className="flex gap-2">
            <button className="btn-secondary h-9 px-3 text-[13px]" onClick={() => { setEditing(false); setDraft(menu); }} disabled={saving}><X size={14} /> Cancel</button>
            <button className="btn-primary h-9 px-3 text-[13px]" onClick={save} disabled={saving}><Check size={14} /> {saving ? 'Saving…' : 'Save menu'}</button>
          </div>
        ) : (
          <button className="btn-secondary h-9 px-3 text-[13px]" onClick={() => setEditing(true)}><Pencil size={14} /> Edit menu</button>
        ))}
      </header>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="custom-table">
          <thead>
            <tr>
              <th className="w-[130px]">Day</th>
              {MEALS.map((m) => <th key={m.key}>{m.label} <span className="font-normal text-[var(--text-tertiary)]">· {m.time}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {WEEK_DAYS.map((day) => (
              <tr key={day} className={day === today ? 'bg-cream-50' : ''}>
                <td className="font-semibold whitespace-nowrap">
                  {day}
                  {day === today && <span className="badge bg-sun-300 text-sun-900 normal-case ml-2">Today</span>}
                </td>
                {MEALS.map((m) => (
                  <td key={m.key} className="text-[13px]">
                    {editing ? (
                      <input className="form-input h-9 text-[13px]" value={draft[day]?.[m.key] || ''} onChange={(e) => setCell(day, m.key, e.target.value)} aria-label={`${day} ${m.label}`} />
                    ) : (
                      shown[day]?.[m.key] || <span className="text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone cards */}
      <div className="md:hidden flex flex-col gap-2 p-3">
        {WEEK_DAYS.map((day) => (
          <div key={day} className={`rounded-xl p-3 ${day === today ? 'bg-cream-100' : 'bg-[var(--bg-primary)]'}`}>
            <div className="text-[13px] font-bold mb-2">{day}{day === today && ' · Today'}</div>
            <dl className="grid grid-cols-1 gap-1.5 m-0">
              {MEALS.map((m) => (
                <div key={m.key} className="grid grid-cols-[84px_1fr] gap-2 items-center">
                  <dt className="text-[12px] text-[var(--text-tertiary)]">{m.label}</dt>
                  <dd className="m-0 text-[13px]">
                    {editing ? (
                      <input className="form-input h-9 text-[13px]" value={draft[day]?.[m.key] || ''} onChange={(e) => setCell(day, m.key, e.target.value)} aria-label={`${day} ${m.label}`} />
                    ) : (shown[day]?.[m.key] || '—')}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WeeklyMenu;
