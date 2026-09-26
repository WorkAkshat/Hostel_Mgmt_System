import { motion } from 'framer-motion';

// Animated ring chart. `segments` = [{ value, color }] drawn clockwise from 12 o'clock.
const DonutRing = ({ segments = [], size = 148, stroke = 16, trackColor = 'var(--color-mint-100)', children, label }) => {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = (size - stroke) / 2;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        {total > 0 &&
          segments.map((segment, index) => {
            const fraction = Math.max(0, segment.value) / total;
            const start = offset;
            offset += fraction;
            if (fraction === 0) return null;
            return (
              <motion.circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={stroke}
                strokeLinecap={fraction < 1 ? 'round' : 'butt'}
                pathLength={1}
                strokeDashoffset={-start}
                initial={{ strokeDasharray: '0 1' }}
                animate={{ strokeDasharray: `${Math.max(0, fraction - (fraction < 1 ? 0.012 : 0))} 1` }}
                transition={{ duration: 0.9, delay: 0.15 + index * 0.12, ease: [0.16, 1, 0.3, 1] }}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
};

export default DonutRing;
