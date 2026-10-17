import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { House, LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { getNavGroups, isItemActive, itemPath, ROLE_LABELS } from '../config/navigation';

// Must match the widths used for the content offset in App.jsx and Header.jsx
export const SIDEBAR_EXPANDED = 264;
export const SIDEBAR_COLLAPSED = 84;

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!user) return null;

  const groups = getNavGroups(user.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // `variant` keeps the desktop and drawer highlight animations independent
  const renderContent = (collapsed, variant) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-3 pt-6 pb-5 ${collapsed ? 'justify-center' : 'px-5'}`}>
        <div className="w-10 h-10 min-w-[40px] rounded-xl bg-white flex items-center justify-center text-brand-600 shadow-[var(--shadow-sm)]">
          <House size={20} strokeWidth={2.2} />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-[var(--text-primary)] leading-tight truncate">Hari Pushp Tower</span>
            <span className="text-[12px] text-brand-700 leading-tight truncate">{ROLE_LABELS[user.role]} portal</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4" aria-label="Main navigation">
        {groups.map((group, index) => (
          <div key={group.label} className={index > 0 ? 'mt-5' : ''}>
            {collapsed ? (
              index > 0 && <div className="mx-auto mb-3 h-px w-8 bg-mint-300" />
            ) : (
              groups.length > 1 && (
                <p className="px-3 mb-1.5 text-[11px] font-semibold text-brand-700/70 tracking-wide">
                  {group.label}
                </p>
              )
            )}
            <ul className="flex flex-col gap-1 list-none m-0 p-0">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item, pathname);
                return (
                  <li key={item.name}>
                    <Link
                      to={itemPath(item)}
                      onClick={isMobileOpen ? onClose : undefined}
                      title={collapsed ? item.name : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center gap-3 h-11 rounded-xl text-[14px] transition-colors ${
                        collapsed ? 'justify-center w-11 mx-auto' : 'px-3'
                      } ${
                        active
                          ? 'text-sun-900 font-semibold'
                          : 'text-[var(--text-secondary)] font-medium hover:bg-mint-300/50 hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId={`sidebar-active-${variant}`}
                          className="absolute inset-0 rounded-xl bg-sun-300"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      <Icon size={18} className="relative shrink-0" />
                      {!collapsed && <span className="relative truncate">{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className={`border-t border-mint-300 p-3 flex gap-1 ${collapsed ? 'flex-col items-center' : 'items-center'}`}>
        <button
          onClick={handleLogout}
          title="Sign out"
          className={`flex items-center gap-3 h-10 rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:bg-white hover:text-[var(--danger)] transition-colors cursor-pointer border-none bg-transparent ${
            collapsed ? 'justify-center w-11' : 'flex-1 px-3'
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        {variant === 'desktop' && (
          <button
            onClick={() => setIsCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-white hover:text-[var(--text-primary)] transition-colors cursor-pointer border-none bg-transparent"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block fixed left-0 top-0 h-screen z-40 bg-[var(--sidebar-bg)] transition-[width] duration-300 ease-in-out"
        style={{ width: isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
      >
        {renderContent(isCollapsed, 'desktop')}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1b2a29]/40 z-50 lg:hidden"
            onClick={onClose}
          >
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative w-[82vw] max-w-[288px] h-full bg-[var(--sidebar-bg)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="absolute top-6 right-4 w-8 h-8 rounded-lg bg-white/70 hover:bg-white border-none flex items-center justify-center cursor-pointer text-[var(--text-secondary)]"
              >
                <X size={16} />
              </button>
              {renderContent(false, 'drawer')}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
