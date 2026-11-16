import { useEffect, useState } from 'react';
import { Clock, Save, X } from 'lucide-react';
import CustomModal from '../../components/CustomModal';
import { MEALS } from '../../config/hostel';

const MealSettingsModal = ({ isOpen, onClose, meals = [], onSave }) => {
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const base = Array.isArray(meals) && meals.length > 0 ? meals : MEALS;
    setDraft(base.map((m) => ({ ...m })));
  }, [isOpen, meals]);

  const handleChange = (index, field, value) => {
    setDraft((curr) => curr.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} title="Edit meal timings & names" size="md">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <p className="text-[12px] text-[var(--text-tertiary)] m-0">
          Change meal display names (e.g. change Snacks to Tea Time) and serving hours. Changes will reflect across both Web and Mobile apps.
        </p>

        <div className="flex flex-col gap-3">
          {draft.map((meal, idx) => (
            <div key={meal.key} className="p-3.5 rounded-xl bg-gray-50 border border-[var(--border-color)] flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Clock size={14} />
                </div>
                <span className="text-[13px] font-bold text-[var(--text-primary)]">
                  Meal #{idx + 1} ({meal.key.toUpperCase()})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Meal Name</label>
                  <input
                    type="text"
                    className="h-9 px-3 rounded-lg border border-[var(--border-color)] bg-white text-[13px] text-[var(--text-color)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={meal.label}
                    onChange={(e) => handleChange(idx, 'label', e.target.value)}
                    placeholder="e.g. Tea Time"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Serving Timing</label>
                  <input
                    type="text"
                    className="h-9 px-3 rounded-lg border border-[var(--border-color)] bg-white text-[13px] text-[var(--text-color)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={meal.time}
                    onChange={(e) => handleChange(idx, 'time', e.target.value)}
                    placeholder="e.g. 4:30–5:30 PM"
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2.5 mt-2 justify-end pt-3 border-t border-[var(--border-color)]">
          <button type="button" className="btn-secondary h-10 px-4 text-[13px]" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-brand h-10 px-5 text-[13px] font-semibold flex items-center gap-2" disabled={saving}>
            <Save size={15} />
            {saving ? 'Saving…' : 'Save meal settings'}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default MealSettingsModal;
