import { ZoomIn } from 'lucide-react';

const TONES = {
  mint: 'bg-mint-100 text-brand-700',
  lilac: 'bg-lilac-100 text-lilac-700',
  peach: 'bg-peach-100 text-peach-700',
  sun: 'bg-sun-200 text-sun-900',
  white: 'bg-white text-brand-700',
};

export const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

// Photo if available (click to enlarge when onPreview is given), otherwise initials.
const Avatar = ({ name = '', src, size = 40, tone = 'mint', rounded = 'rounded-full', onPreview, className = '' }) => {
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) };

  if (src) {
    const img = <img src={src} alt={name} className="w-full h-full object-cover" />;
    if (!onPreview) {
      return <span className={`block shrink-0 overflow-hidden ${rounded} ${className}`} style={style}>{img}</span>;
    }
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPreview({ url: src, name }); }}
        className={`group relative block shrink-0 overflow-hidden p-0 border-none cursor-zoom-in ${rounded} ${className}`}
        style={style}
        aria-label={`View photo of ${name}`}
      >
        {img}
        <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <ZoomIn size={Math.round(size * 0.38)} className="text-white" />
        </span>
      </button>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 font-bold ${rounded} ${TONES[tone] || TONES.mint} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
};

export default Avatar;
