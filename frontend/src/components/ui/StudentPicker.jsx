import { useMemo, useState } from 'react';
import Avatar from './Avatar';

const subline = (s) => `${s.rollNumber}${s.room ? ` · Room ${s.room.roomNumber}` : ' · No room'}`;

// Type-ahead to choose one resident by name, roll number or room.
const StudentPicker = ({ students = [], value, onChange, id, autoFocus, placeholder = 'e.g. Priya or 204' }) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || value) return [];
    return students
      .filter((s) => [s.user?.name, s.rollNumber, s.room?.roomNumber].some((v) => v && String(v).toLowerCase().includes(q)))
      .slice(0, 6);
  }, [students, query, value]);

  const pick = (s) => {
    onChange(s);
    setQuery('');
    setCursor(0);
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-mint-50 border border-mint-200">
        <Avatar name={value.user?.name} src={value.user?.avatar || value.profilePic} size={36} tone="white" />
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold truncate">{value.user?.name}</span>
          <span className="block text-[12px] text-[var(--text-tertiary)]">{subline(value)}</span>
        </span>
        <button type="button" className="btn-secondary h-8 px-3 text-[12px]" onClick={() => onChange(null)}>Change</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        id={id}
        className="form-input"
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={matches.length > 0}
        aria-controls={`${id}-list`}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
        onKeyDown={(e) => {
          if (!matches.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, matches.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
          if (e.key === 'Enter') { e.preventDefault(); pick(matches[cursor]); }
        }}
        placeholder={placeholder}
      />
      {matches.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="list-none m-0 p-1 absolute left-0 right-0 top-12 z-10 bg-white border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)]">
          {matches.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === cursor}>
              <button
                type="button"
                onClick={() => pick(s)}
                onMouseEnter={() => setCursor(i)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg border-none cursor-pointer text-left ${i === cursor ? 'bg-mint-50' : 'bg-transparent'}`}
              >
                <Avatar name={s.user?.name} size={30} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold truncate">{s.user?.name}</span>
                  <span className="block text-[12px] text-[var(--text-tertiary)]">{subline(s)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && !matches.length && (
        <p className="text-[12px] text-[var(--text-tertiary)] mt-1.5 mb-0">No resident matches “{query.trim()}”.</p>
      )}
    </div>
  );
};

export default StudentPicker;
