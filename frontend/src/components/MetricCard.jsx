const MetricCard = ({ title, value, subtitle, icon, color }) => {
  const accentColor = color || 'var(--accent)';
  return (
    <div 
      className="glass-card p-6 flex justify-between items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[0.8rem] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{title}</span>
        <h2 className="text-3xl font-extrabold text-[var(--text-primary)] my-0.5">{value}</h2>
        <span className="text-xs text-[var(--text-tertiary)]">{subtitle}</span>
      </div>
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center border border-black/5"
        style={{
          background: `${accentColor}12`,
          color: accentColor
        }}
      >
        {icon}
      </div>
    </div>
  );
};

export default MetricCard;
