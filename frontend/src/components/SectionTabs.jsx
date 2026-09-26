import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getActiveSection } from '../config/navigation';

// Tab bar for sidebar sections that bundle several pages (Students, Finance…).
// Rendered by the layout outside the animated page, so the highlight can
// slide between tabs instead of re-mounting with the page.
const SectionTabs = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const section = user ? getActiveSection(user.role, pathname) : null;

  if (!section) return null;

  const Icon = section.icon;

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="w-9 h-9 rounded-xl bg-mint-200 text-brand-700 flex items-center justify-center">
          <Icon size={18} />
        </span>
        <span className="text-[15px] font-bold text-[var(--text-primary)]">{section.name}</span>
      </div>

      <nav
        className="flex gap-1 p-1 rounded-2xl bg-white border border-[var(--border-color)] overflow-x-auto custom-scrollbar max-w-full"
        aria-label={`${section.name} sections`}
      >
        {section.tabs.map((tab) => {
          const active = tab.path === pathname;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              aria-current={active ? 'page' : undefined}
              className={`relative px-4 h-9 flex items-center rounded-xl text-[13px] whitespace-nowrap transition-colors ${
                active ? 'text-sun-900 font-semibold' : 'text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)] hover:bg-mint-50'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="section-tab-active"
                  className="absolute inset-0 rounded-xl bg-sun-300"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{tab.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default SectionTabs;
