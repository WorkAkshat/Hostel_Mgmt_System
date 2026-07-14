import { TrendingUp, TrendingDown, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

const MetricCard = ({ title, value, subtitle, icon, color }) => {
  const accentColor = color || 'var(--primary)';

  // Mock trends and sparklines to mimic real-time production analytics
  const getCardData = () => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('revenue')) {
      return { 
        trend: { text: '12%', positive: false }, // matching reference image where revenue is -12%
        points: "0,40 10,38 20,42 30,35 40,38 50,25 60,30 70,22 80,28 90,15 100,20",
        sparkColor: '#10b981' // emerald for revenue sparkline in reference
      };
    }
    if (lowerTitle.includes('occupancy')) {
      return { 
        trend: { text: '8%', positive: true },
        points: "0,35 10,32 20,38 30,30 40,28 50,32 60,25 70,28 80,20 90,22 100,10",
        sparkColor: '#3b82f6' // blue for occupancy sparkline
      };
    }
    if (lowerTitle.includes('visitor')) {
      return { 
        trend: { text: '0%', positive: true }, // -0% in reference
        points: "0,25 10,28 20,22 30,25 40,15 50,18 60,10 70,12 80,20 90,15 100,5",
        sparkColor: '#8b5cf6' // violet for visitors sparkline
      };
    }
    return { 
      trend: { text: '100%', positive: true }, // +100% for maintenance
      points: "0,45 10,42 20,48 30,38 40,42 50,30 60,35 70,25 80,30 90,20 100,25",
      sparkColor: '#f59e0b' // amber for maintenance
    }; 
  };

  const { trend, points, sparkColor } = getCardData();

  return (
    <motion.div 
      whileHover={{ y: -4, boxShadow: '0 10px 35px rgba(15,23,42,0.08)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="glass-card p-5 relative overflow-hidden group flex flex-col h-[160px]"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/50 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)`,
              color: accentColor
            }}
          >
            {icon}
          </div>
          <span className="text-[13px] font-bold text-slate-700">{title}</span>
        </div>
        <button className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer">
          <MoreVertical size={16} />
        </button>
      </div>

      <div className="flex flex-col flex-grow justify-center relative z-10">
        <div className="flex items-end justify-between">
          <h2 className="text-[28px] font-extrabold text-slate-800 tracking-tight leading-none">{value}</h2>
          <span className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
            trend.positive ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'
          }`}>
            {trend.positive ? '↑' : '↓'} {trend.text}
          </span>
        </div>
        <span className="text-[12px] font-medium text-slate-500 mt-2">{subtitle}</span>
      </div>

      {/* Aesthetic Sparkline mimicking reference image */}
      <div className="absolute bottom-0 left-0 right-0 h-[60px] opacity-60 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={`gradient-${title.replace(/\s+/g, '')}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={sparkColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={sparkColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path 
            d={`M0,50 L${points.split(' ').map(p => `L${p}`).join(' ').substring(1)} L100,50 Z`} 
            fill={`url(#gradient-${title.replace(/\s+/g, '')})`} 
          />
          <polyline 
            points={points} 
            fill="none" 
            stroke={sparkColor} 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>
    </motion.div>
  );
};

export default MetricCard;
