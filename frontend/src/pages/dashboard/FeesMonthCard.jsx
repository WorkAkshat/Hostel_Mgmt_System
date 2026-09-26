import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { Card, CardHeader } from './DashboardWidgets';
import DonutRing from '../../components/ui/DonutRing';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import { formatRupees, initials, plural } from './dashboardUtils';

// This month's billing vs collection, plus the oldest overdue invoices.
const FeesMonthCard = ({ month, overdue, className = '' }) => {
  const { billed, collected, pending } = month;
  const pct = collected + pending > 0 ? Math.round((collected / (collected + pending)) * 100) : 0;
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' });
  const overdueTotal = overdue.reduce((sum, i) => sum + i.amount, 0);

  return (
    <Card className={className}>
      <CardHeader icon={Wallet} tone="sun" title={`Fees in ${monthName}`} to="/admin/fees" linkLabel="Invoices" />

      <div className="flex items-center gap-5">
        <DonutRing
          size={124}
          stroke={14}
          segments={[
            { value: collected, color: 'var(--color-brand-500)' },
            { value: pending, color: 'var(--color-sun-300)' },
          ]}
          label={`${pct}% of this month's fees collected`}
        >
          <span className="text-[22px] font-bold leading-none"><AnimatedNumber value={pct} />%</span>
          <span className="text-[11px] text-[var(--text-tertiary)] mt-1">collected</span>
        </DonutRing>

        <dl className="flex-1 min-w-0 grid gap-2.5 m-0">
          <div>
            <dt className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Collected
            </dt>
            <dd className="m-0 text-[18px] font-bold"><AnimatedNumber value={collected} format={formatRupees} /></dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <span className="w-2.5 h-2.5 rounded-full bg-sun-300" /> Still to collect
            </dt>
            <dd className="m-0 text-[18px] font-bold"><AnimatedNumber value={pending} format={formatRupees} /></dd>
          </div>
          <div className="text-[12px] text-[var(--text-tertiary)]">Billed this month: {formatRupees(billed)}</div>
        </dl>
      </div>

      <div className="mt-5 pt-4 border-t border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold">Overdue</span>
          <span className={`text-[13px] font-semibold ${overdue.length ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
            {overdue.length ? `${plural(overdue.length, 'invoice')} · ${formatRupees(overdueTotal)}` : 'Nothing overdue'}
          </span>
        </div>
        {overdue.length > 0 && (
          <ul className="list-none m-0 p-0 flex flex-col gap-1">
            {overdue.slice(0, 3).map((inv) => (
              <li key={inv.id}>
                <Link to="/admin/fees" className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-[var(--danger-bg)] transition-colors">
                  <span className="w-7 h-7 rounded-full bg-peach-100 text-peach-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                    {initials(inv.name)}
                  </span>
                  <span className="flex-1 min-w-0 text-[13px] truncate">{inv.name}</span>
                  <span className="text-[12px] text-[var(--danger)] shrink-0">{plural(inv.daysLate, 'day')} late</span>
                  <span className="text-[13px] font-semibold shrink-0">{formatRupees(inv.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};

export default FeesMonthCard;
