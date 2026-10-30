import { useEffect, useState } from 'react';
import { Check, Plus, Trash2, Vote, X } from 'lucide-react';
import CustomModal from '../../components/CustomModal';
import { useToast } from '../../components/ui/Toast';
import { polls as pollsApi } from '../../utils/api';

const AUDIENCES = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'STUDENTS', label: 'Residents only' },
  { value: 'STAFF', label: 'Staff only' },
];

const EditPollModal = ({ isOpen, poll, onClose, onSuccess }) => {
  const toast = useToast();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [target, setTarget] = useState('ALL');
  const [anonymous, setAnonymous] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !poll) return;
    setQuestion(poll.question || '');
    const rawOpts = (poll.options || []).map((o) => (typeof o === 'string' ? o : o.option));
    setOptions(rawOpts.length >= 2 ? rawOpts : ['', '']);
    setTarget(poll.target || 'ALL');
    setAnonymous(Boolean(poll.anonymous));
    setIsActive(Boolean(poll.isActive));
    setError(null);
    setSaving(false);
  }, [isOpen, poll]);

  const setOption = (index, val) => {
    setOptions((list) => list.map((opt, i) => (i === index ? val : opt)));
    setError(null);
  };

  const addOption = () => {
    if (options.length < 8) {
      setOptions((list) => [...list, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions((list) => list.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 3) {
      setError('Please enter a valid question (at least 3 characters).');
      return;
    }
    const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) {
      setError('Please provide at least 2 distinct answer options.');
      return;
    }
    if (new Set(cleanOpts.map((o) => o.toLowerCase())).size !== cleanOpts.length) {
      setError('Options cannot have duplicates.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await pollsApi.update(poll.id, {
        question: q,
        options: cleanOpts,
        target,
        anonymous,
        isActive,
      });
      toast.success('Poll updated', 'Your changes have been saved.');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not update poll.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} title="Edit poll" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium border border-rose-200">
            {error}
          </div>
        )}

        {/* Question */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-[var(--text-primary)]">
            Question <span className="text-[var(--danger)]">*</span>
          </label>
          <textarea
            className="form-input min-h-[70px] resize-none"
            placeholder="What would you like to ask?"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setError(null);
            }}
          />
        </div>

        {/* Answer Options */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-semibold text-[var(--text-primary)] flex items-center justify-between">
            <span>Answers <span className="text-[var(--danger)]">*</span></span>
            <span className="text-[11px] text-[var(--text-tertiary)] font-normal">2 to 8 answers</span>
          </label>
          <div className="flex flex-col gap-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-mint-100 text-brand-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  className="form-input flex-1 py-1.5 text-[13px]"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-peach-50 bg-transparent border-none cursor-pointer"
                    title="Remove option"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 8 && (
            <button
              type="button"
              onClick={addOption}
              className="btn-secondary h-8 px-3 text-[12px] flex items-center gap-1.5 self-start mt-1"
            >
              <Plus size={14} /> Add option
            </button>
          )}
        </div>

        {/* Who can vote */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-[var(--text-primary)]">Who can vote</label>
          <select
            className="form-input cursor-pointer"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        {/* Settings toggles */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--border-color)] bg-mint-50/50 cursor-pointer">
            <input
              type="checkbox"
              className="accent-brand-600 w-4 h-4 rounded cursor-pointer"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
              {isActive ? 'Poll is live (Open)' : 'Poll is closed'}
            </span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--border-color)] bg-mint-50/50 cursor-pointer">
            <input
              type="checkbox"
              className="accent-brand-600 w-4 h-4 rounded cursor-pointer"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
              {anonymous ? 'Anonymous' : 'Names visible'}
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 justify-end pt-3 border-t border-[var(--border-color)]">
          <button
            type="button"
            className="btn-secondary h-10 px-4 text-[13px]"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-brand h-10 px-5 text-[13px] font-semibold flex items-center gap-2"
            disabled={saving}
          >
            <Check size={16} />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default EditPollModal;

