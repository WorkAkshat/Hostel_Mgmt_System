import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DoorOpen, Footprints } from 'lucide-react';
import { Card, CardHeader, EmptyState, MiniTabs } from './DashboardWidgets';
import { initials, residentName, roomOf, shortDate, timeAgo } from './dashboardUtils';

// Who is away on leave right now, and which visitors are inside.
const OutsideCard = ({ outNow, visitorsInside, className = '' }) => {
  const [tab, setTab] = useState('out');

  return (
    <Card className={className}>
      <CardHeader icon={Footprints} tone="lilac" title="In & out">
        <MiniTabs
          id="in-out"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'out', label: 'On leave', count: outNow.length },
            { value: 'visitors', label: 'Visitors', count: visitorsInside.length },
          ]}
        />
      </CardHeader>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: tab === 'out' ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'out' ? (
            outNow.length === 0 ? (
              <EmptyState icon={Footprints} text="Every resident is inside the hostel." />
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col gap-2">
                {outNow.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-lilac-50">
                    <span className="w-9 h-9 rounded-full bg-lilac-100 text-lilac-700 text-[12px] font-bold flex items-center justify-center shrink-0">
                      {initials(residentName(l))}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold truncate">{residentName(l)}</span>
                      <span className="block text-[12px] text-[var(--text-tertiary)] truncate">
                        {roomOf(l) ? `Room ${roomOf(l)} · ` : ''}{l.destination || 'Out'} · since {timeAgo(l.checkoutTime)}
                      </span>
                    </span>
                    <span className={`badge shrink-0 ${l.late ? 'badge-danger' : l.dueToday ? 'badge-warning' : 'badge-info'}`}>
                      {l.late ? 'Late' : l.dueToday ? 'Back today' : `Back ${shortDate(l.endDate)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : visitorsInside.length === 0 ? (
            <EmptyState icon={DoorOpen} text="No visitors inside right now." />
          ) : (
            <ul className="list-none m-0 p-0 flex flex-col gap-2">
              {visitorsInside.slice(0, 5).map((v) => (
                <li key={v.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-peach-50">
                  <span className="w-9 h-9 rounded-full bg-peach-100 text-peach-700 text-[12px] font-bold flex items-center justify-center shrink-0">
                    {initials(v.name)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold truncate">{v.name}</span>
                    <span className="block text-[12px] text-[var(--text-tertiary)] truncate">
                      {v.relationship} of {residentName(v)}{roomOf(v) ? ` · ${roomOf(v)}` : ''}
                    </span>
                  </span>
                  <span className="text-[12px] text-[var(--text-tertiary)] shrink-0">{timeAgo(v.checkInTime)}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </AnimatePresence>
    </Card>
  );
};

export default OutsideCard;
